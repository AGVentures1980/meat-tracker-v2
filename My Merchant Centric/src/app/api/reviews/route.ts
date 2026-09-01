import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, enforceScopeAccess } from '@/lib/auth';
import { SentimentValue } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get('locationId') || searchParams.get('entityId');
  const rating = searchParams.get('rating');
  const sentiment = searchParams.get('sentiment');
  const query = searchParams.get('query');

  try {
    let targetLocationIds: string[] = [];
    if (locationId && locationId !== 'ALL') {
      await enforceScopeAccess(session, { locationId });
      targetLocationIds = [locationId];
    } else {
      const allLocs = await db.location.findMany({
        where: { organizationId: session.organizationId },
        select: { id: true },
      });
      targetLocationIds = allLocs.map(l => l.id);
    }

    if (targetLocationIds.length === 0) {
      return NextResponse.json([]);
    }

    const whereClause: any = {
      organizationId: session.organizationId,
      locationId: { in: targetLocationIds },
      contentType: 'REVIEW',
      status: 'ACTIVE',
      provenanceMode: { in: ['LIVE', 'IMPORTED'] }
    };

    if (rating && rating !== 'ALL') {
      whereClause.rating = parseFloat(rating);
    }

    if (sentiment && sentiment !== 'ALL') {
      whereClause.sentimentAnalysis = {
        overallSentiment: sentiment as SentimentValue,
      };
    }

    if (query) {
      whereClause.OR = [
        { text: { contains: query, mode: 'insensitive' } },
        { authorName: { contains: query, mode: 'insensitive' } },
      ];
    }

    const reviews = await db.contentItem.findMany({
      where: whereClause,
      include: {
        location: { select: { name: true } },
        sentimentAnalysis: true,
        topicMentions: { include: { topic: true } },
        menuMentions: { include: { menuItem: true } },
        employeeMentions: true,
        reviewResponses: true,
        recoveryCases: true,
      },
      orderBy: { publishedAt: 'desc' },
    });

    return NextResponse.json(reviews);
  } catch (err: any) {
    console.error('Fetch reviews API error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
