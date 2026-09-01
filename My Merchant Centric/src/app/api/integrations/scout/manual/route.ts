import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, enforceTenantIsolation, enforceScopeAccess } from '@/lib/auth';
import { AcquisitionMethod, CoverageType, ContentType, ProcessingStatus } from '@prisma/client';
import { checkSourcePolicy, recalculateDataCoverage } from '@/lib/services/scoutService';

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      organizationId,
      locationId,
      competitorLocationId,
      provider, // e.g. GOOGLE
      authorName,
      rating,
      text,
      publishedAt,
      sourceUrl
    } = body;

    if (!organizationId || !provider || !text || !rating) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Tenant Isolation
    enforceTenantIsolation(session, organizationId);

    // Resolve location access check
    if (locationId) {
      await enforceScopeAccess(session, { locationId });
    } else if (competitorLocationId) {
      const compLoc = await db.competitorLocation.findFirst({
        where: { id: competitorLocationId, organizationId }
      });
      if (!compLoc) return NextResponse.json({ error: 'Unauthorized competitor' }, { status: 403 });
    } else {
      return NextResponse.json({ error: 'Must specify locationId or competitorLocationId' }, { status: 400 });
    }

    // Check source policy before manual action
    const allowed = await checkSourcePolicy(provider, 'allowManualImport');
    if (!allowed) {
      return NextResponse.json({ error: 'BLOCKED_BY_SOURCE_POLICY: Manual ingestion not allowed by active policy.' }, { status: 403 });
    }

    const ratingVal = parseFloat(rating);
    if (ratingVal < 1 || ratingVal > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    // Ingest as ContentItem
    const item = await db.contentItem.create({
      data: {
        organizationId,
        dataSourceId: provider.toUpperCase(),
        contentType: ContentType.REVIEW,
        locationId: locationId || null,
        competitorLocationId: competitorLocationId || null,
        authorName: authorName || 'Guest Reviewer',
        text,
        rating: ratingVal,
        url: sourceUrl || null,
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
        processingStatus: ProcessingStatus.INGESTED,
        provenanceMode: 'IMPORTED',
        provenanceConnector: 'MANUAL',
        provenanceConfidence: 1.0,
        acquisitionMethod: AcquisitionMethod.MANUAL,
        coverageType: CoverageType.PARTIAL,
      }
    });

    // Audit logs
    await db.auditLog.create({
      data: {
        organizationId,
        userId: session.id,
        action: 'MANUAL_REVIEW_INGESTION',
        entityType: 'CONTENT_ITEM',
        entityId: item.id,
        newValue: { provider, rating: ratingVal, authorName }
      }
    });

    // Ingest run log
    await db.ingestionRun.create({
      data: {
        organizationId,
        locationId: locationId || null,
        competitorLocationId: competitorLocationId || null,
        provider: provider.toUpperCase(),
        acquisitionMethod: AcquisitionMethod.MANUAL,
        coverageType: CoverageType.PARTIAL,
        status: 'COMPLETED',
        rawItemsReceived: 1,
        normalizedItems: 1,
        deduplicatedItems: 0,
        acceptedItems: 1,
        rejectedItems: 0,
        completedAt: new Date()
      }
    });

    // Queue AI analysis
    await db.job.create({
      data: {
        type: 'analyzeContent',
        payload: { contentItemId: item.id }
      }
    });

    // Recalculate coverage metrics
    await recalculateDataCoverage(organizationId, locationId || null, competitorLocationId || null, provider);

    return NextResponse.json({ success: true, item });
  } catch (err: any) {
    console.error('Manual review ingestion error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
