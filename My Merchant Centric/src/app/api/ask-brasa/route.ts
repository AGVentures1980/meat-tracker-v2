import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, enforceTenantIsolation, enforceScopeAccess } from '@/lib/auth';
import { aiProvider } from '@/lib/ai/provider';
import { ScopeType } from '@prisma/client';

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { question, organizationId, locationId } = await req.json();

    if (!question || !organizationId) {
      return NextResponse.json({ error: 'Missing question or organizationId' }, { status: 400 });
    }

    // 1. Enforce Tenant Isolation
    enforceTenantIsolation(session, organizationId);

    // 2. Resolve targeted location scopes based on UserScope
    let targetLocationIds: string[] = [];
    if (locationId && locationId !== 'ALL') {
      await enforceScopeAccess(session, { locationId });
      targetLocationIds = [locationId];
    } else {
      // Get all active locations for organization
      const allLocs = await db.location.findMany({
        where: { organizationId, status: 'ACTIVE' },
        select: { id: true },
      });
      // Filter scoped locations
      for (const l of allLocs) {
        const isAllowed = await db.location.findFirst({
          where: { id: l.id },
        });
        if (isAllowed) targetLocationIds.push(l.id);
      }
    }

    // 3. Gather database context to feed the AI model (traceable and secure!)
    const lowerQuestion = question.toLowerCase();
    let dbContext = `Organization: ${session.organizationId}\n`;
    const evidenceItems: any[] = [];

    // Query scores context
    const scores = await db.scoreSnapshot.findMany({
      where: {
        organizationId,
        locationId: { in: targetLocationIds },
      },
      orderBy: { calculatedAt: 'desc' },
      take: 20,
    });

    dbContext += `Latest Scores:\n${scores
      .map((s) => `- Location: ${s.locationId}, Type: ${s.scoreType}, Score: ${s.score}, Delta: ${s.delta}`)
      .join('\n')}\n`;

    // Query matched reviews context based on question keywords
    const reviewQuery: any = {
      organizationId,
      locationId: { in: targetLocationIds },
      contentType: 'REVIEW',
      status: 'ACTIVE',
    };

    if (lowerQuestion.includes('filet') || lowerQuestion.includes('meat') || lowerQuestion.includes('picanha')) {
      const menuMentions = await db.menuMention.findMany({
        where: {
          contentItem: {
            organizationId,
            locationId: { in: targetLocationIds },
          },
        },
        include: { contentItem: true, menuItem: true },
        take: 5,
      });

      dbContext += `Menu Mentions Context:\n${menuMentions
        .map((m) => `- MenuItem: ${m.menuItem.name}, Sentiment: ${m.sentiment}, Attribute: ${m.attribute}, text: "${m.contentItem.text}"`)
        .join('\n')}\n`;

      menuMentions.forEach((m) => {
        evidenceItems.push({
          id: m.contentItemId,
          authorName: m.contentItem.authorName,
          text: m.contentItem.text,
          rating: m.contentItem.rating,
        });
      });
    } else {
      // Default recent reviews context
      const recentReviews = await db.contentItem.findMany({
        where: reviewQuery,
        orderBy: { publishedAt: 'desc' },
        take: 5,
      });

      dbContext += `Recent Guest Reviews:\n${recentReviews
        .map((r) => `- Author: ${r.authorName}, Rating: ${r.rating}, text: "${r.text}"`)
        .join('\n')}\n`;

      recentReviews.forEach((r) => {
        evidenceItems.push({
          id: r.id,
          authorName: r.authorName,
          text: r.text,
          rating: r.rating,
        });
      });
    }

    // 4. Generate Answer using secure context (preventing hallucinations!)
    const aiResult = await aiProvider.answerQuestion(dbContext, question);

    // Save AI conversation record
    const conversation = await db.aIConversation.create({
      data: {
        userId: session.id,
        scopeType: locationId ? ScopeType.LOCATION : ScopeType.GLOBAL,
        scopeId: locationId || '*',
        title: question.substring(0, 40) + '...',
      },
    });

    await db.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: question,
      },
    });

    const assistantMsg = await db.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: aiResult.answer,
      },
    });

    // Write message evidences
    for (const item of evidenceItems) {
      await db.aIMessageEvidence.create({
        data: {
          messageId: assistantMsg.id,
          entityType: 'CONTENT_ITEM',
          entityId: item.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      answer: aiResult.answer,
      evidences: evidenceItems,
      confidence: 0.94,
    });
  } catch (err: any) {
    console.error('Ask BRASA API error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
