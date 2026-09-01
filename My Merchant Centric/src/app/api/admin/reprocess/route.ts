import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { Role, ProcessingStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || !session.roles.includes(Role.CORPORATE_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized: Corporate Admin only.' }, { status: 403 });
  }

  try {
    const { locationId, startDate, endDate } = await req.json();

    const query: any = {
      organizationId: session.organizationId,
      status: 'ACTIVE',
    };

    if (locationId && locationId !== 'ALL') {
      query.locationId = locationId;
    }

    if (startDate || endDate) {
      query.publishedAt = {};
      if (startDate) query.publishedAt.gte = new Date(startDate);
      if (endDate) query.publishedAt.lte = new Date(endDate);
    }

    const itemsToReprocess = await db.contentItem.findMany({
      where: query,
      select: { id: true },
    });

    const jobIds: string[] = [];
    for (const item of itemsToReprocess) {
      // Set status back to Normalized / Ingested
      await db.contentItem.update({
        where: { id: item.id },
        data: { processingStatus: ProcessingStatus.NORMALIZED },
      });

      const job = await db.job.create({
        data: {
          type: 'analyzeContent',
          payload: { contentItemId: item.id },
        },
      });
      jobIds.push(job.id);
    }

    // Write Audit Log
    await db.auditLog.create({
      data: {
        organizationId: session.organizationId,
        userId: session.id,
        action: 'REPROCESS_CONTENT_ITEMS',
        entityType: 'LOCATION',
        entityId: locationId || 'ALL',
        newValue: { count: itemsToReprocess.length },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully enqueued ${itemsToReprocess.length} content items for reprocessing.`,
      jobIds,
    });
  } catch (err: any) {
    console.error('Reprocess API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
