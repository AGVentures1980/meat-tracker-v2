import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, enforceScopeAccess } from '@/lib/auth';
import { aiProvider } from '@/lib/ai/provider';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const reviewId = params.id;

  try {
    const review = await db.contentItem.findUnique({
      where: { id: reviewId },
      include: { sentimentAnalysis: true },
    });

    if (!review || review.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    if (review.locationId) {
      await enforceScopeAccess(session, { locationId: review.locationId });
    }

    // Generate AI draft
    const responseText = await aiProvider.generateReviewResponse(
      review.text,
      review.rating || 3,
      review.sentimentAnalysis?.overallSentiment || 'NEUTRAL'
    );

    // Save response record
    const response = await db.reviewResponse.upsert({
      where: { contentItemId: reviewId },
      update: {
        suggestedResponse: responseText,
        generatedByAI: true,
        status: 'PENDING_APPROVAL',
      },
      create: {
        contentItemId: reviewId,
        suggestedResponse: responseText,
        generatedByAI: true,
        status: 'PENDING_APPROVAL',
      },
    });

    return NextResponse.json({ success: true, response });
  } catch (err: any) {
    console.error('API response generation error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const reviewId = params.id;

  try {
    const { action, text } = await req.json();

    const review = await db.contentItem.findUnique({
      where: { id: reviewId },
    });

    if (!review || review.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    if (review.locationId) {
      await enforceScopeAccess(session, { locationId: review.locationId });
    }

    if (action === 'APPROVE') {
      const updated = await db.reviewResponse.update({
        where: { contentItemId: reviewId },
        data: {
          finalResponse: text,
          approvedBy: session.id,
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, response: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('API response update error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
