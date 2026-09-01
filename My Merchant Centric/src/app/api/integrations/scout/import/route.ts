import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, enforceTenantIsolation, enforceScopeAccess } from '@/lib/auth';
import { AcquisitionMethod, CoverageType, ContentType, ProcessingStatus } from '@prisma/client';
import { recalculateDataCoverage } from '@/lib/services/scoutService';

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
      provider, // e.g. GOOGLE, YELP, OPENTABLE
      reviews,  // Array of mapped records
      coverageType = 'PARTIAL' // COMPLETE, PARTIAL, UNKNOWN
    } = body;

    if (!organizationId || !provider || !reviews || !Array.isArray(reviews)) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Tenant Boundary Enforcement
    enforceTenantIsolation(session, organizationId);

    // 2. Resolve Target Target Location scope checks
    if (locationId) {
      await enforceScopeAccess(session, { locationId });
    } else if (competitorLocationId) {
      // Validate competitor location belongs to tenant organization
      const compLoc = await db.competitorLocation.findFirst({
        where: { id: competitorLocationId, organizationId }
      });
      if (!compLoc) {
        return NextResponse.json({ error: 'Competitor location not found or unauthorized' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Must specify locationId or competitorLocationId' }, { status: 400 });
    }

    const coverage: CoverageType = coverageType as CoverageType;

    // Create IngestionRun
    const ingestionRun = await db.ingestionRun.create({
      data: {
        organizationId,
        locationId: locationId || null,
        competitorLocationId: competitorLocationId || null,
        provider: provider.toUpperCase(),
        acquisitionMethod: AcquisitionMethod.CLIENT_IMPORT,
        coverageType: coverage,
        status: 'RUNNING',
        rawItemsReceived: reviews.length,
      }
    });

    let rawItemsReceived = reviews.length;
    let normalizedItems = 0;
    let deduplicatedItems = 0;
    let acceptedItems = 0;
    let rejectedItems = 0;
    const errors: string[] = [];

    for (const r of reviews) {
      // Validate fields
      const ratingVal = r.rating ? parseFloat(r.rating) : null;
      const textVal = r.reviewText || r.text || '';
      const authorVal = r.author || r.authorName || 'Guest Reviewer';
      const extId = r.externalReviewId || r.externalId || `csv-${Date.now()}-${Math.random()}`;
      const publishedVal = r.publishedAt ? new Date(r.publishedAt) : new Date();

      if (!textVal) {
        rejectedItems++;
        errors.push(`Row rejected: Review content cannot be empty.`);
        continue;
      }

      if (ratingVal !== null && (ratingVal < 1 || ratingVal > 5)) {
        rejectedItems++;
        errors.push(`Row rejected: Rating must be between 1 and 5 (got ${ratingVal}).`);
        continue;
      }

      normalizedItems++;

      // Deduplication check
      const existing = await db.contentItem.findFirst({
        where: {
          organizationId,
          dataSourceId: provider.toUpperCase(),
          externalId: extId,
        }
      });

      if (existing) {
        deduplicatedItems++;
        continue;
      }

      // Ingest
      const item = await db.contentItem.create({
        data: {
          organizationId,
          dataSourceId: provider.toUpperCase(),
          contentType: ContentType.REVIEW,
          locationId: locationId || null,
          competitorLocationId: competitorLocationId || null,
          authorName: authorVal,
          text: textVal,
          rating: ratingVal,
          externalId: extId,
          url: r.sourceUrl || r.url || null,
          publishedAt: publishedVal,
          processingStatus: ProcessingStatus.INGESTED,
          provenanceMode: 'IMPORTED',
          provenanceConnector: 'CSV_IMPORT',
          provenanceConfidence: 1.0,
          acquisitionMethod: AcquisitionMethod.CLIENT_IMPORT,
          coverageType: coverage,
        }
      });

      // Queue AI process
      await db.job.create({
        data: {
          type: 'analyzeContent',
          payload: { contentItemId: item.id }
        }
      });

      acceptedItems++;
    }

    // Complete IngestionRun
    await db.ingestionRun.update({
      where: { id: ingestionRun.id },
      data: {
        status: rejectedItems > 0 ? 'PARTIAL' : 'COMPLETED',
        rawItemsReceived,
        normalizedItems,
        deduplicatedItems,
        acceptedItems,
        rejectedItems,
        completedAt: new Date(),
        metadata: { errors }
      }
    });

    // Recalculate coverage metrics
    await recalculateDataCoverage(organizationId, locationId || null, competitorLocationId || null, provider);

    return NextResponse.json({
      success: true,
      ingestionRunId: ingestionRun.id,
      rawItemsReceived,
      normalizedItems,
      deduplicatedItems,
      acceptedItems,
      rejectedItems,
      errorsCount: errors.length,
      errors,
    });
  } catch (err: any) {
    console.error('CSV import route error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
