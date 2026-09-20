import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, enforceScopeAccess } from '@/lib/auth';
import { RawReviewRow, computeReviewContentHash } from '@/lib/scout/reviewDeduplicationEngine';

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { rows = [], locationId, brasaLocationId, organizationId } = body;

    const targetOrgId = organizationId || session.organizationId;
    const isCorporate = session.roles?.includes('CORPORATE_ADMIN' as any) || session.roles?.includes('SUPER_ADMIN' as any);
    if (targetOrgId !== session.organizationId && !isCorporate) {
      return NextResponse.json({ error: 'Scope access denied' }, { status: 403 });
    }

    // Location Resolution
    let matchedLocation = null;
    let resolutionStatus: 'MATCHED' | 'AMBIGUOUS' | 'UNMATCHED' = 'UNMATCHED';

    if (locationId) {
      matchedLocation = await db.location.findFirst({
        where: { id: locationId, organizationId: targetOrgId }
      });
      if (matchedLocation) resolutionStatus = 'MATCHED';
    } else if (brasaLocationId) {
      matchedLocation = await db.location.findFirst({
        where: { brasaLocationId, organizationId: targetOrgId }
      });
      if (matchedLocation) resolutionStatus = 'MATCHED';
    }

    if (matchedLocation) {
      await enforceScopeAccess(session, { locationId: matchedLocation.id });
    }

    // Fetch existing external IDs and hashes for deduplication checks
    const existingContentItems = matchedLocation ? await db.contentItem.findMany({
      where: { locationId: matchedLocation.id },
      select: { externalId: true, contentHash: true }
    }) : [];

    const existingExtIds = new Set<string>(existingContentItems.map(c => c.externalId!).filter(Boolean));
    const existingHashes = new Set<string>(existingContentItems.map(c => c.contentHash!).filter(Boolean));

    const seenBatchExtIds = new Set<string>();
    const seenBatchHashes = new Set<string>();

    let acceptedRows = 0;
    let duplicateRows = 0;
    let invalidRows = 0;
    const invalidReasons: string[] = [];

    const sourceDistribution: Record<string, number> = {};
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let earliestDate: Date | null = null;
    let latestDate: Date | null = null;

    for (const r of rows as RawReviewRow[]) {
      const rawText = (r.reviewText || '').trim();
      
      // Validation 1: Text & Rating presence
      if (!rawText && (r.rating === undefined || r.rating === null)) {
        invalidRows++;
        invalidReasons.push('Review text and rating cannot both be empty.');
        continue;
      }

      // Validation 2: Rating bounds
      let numRating: number | null = null;
      if (r.rating !== undefined && r.rating !== null) {
        numRating = parseFloat(String(r.rating));
        if (isNaN(numRating) || numRating < 1.0 || numRating > 5.0) {
          invalidRows++;
          invalidReasons.push(`Rating '${r.rating}' is outside 1.0 - 5.0 bounds.`);
          continue;
        }
        const intRating = Math.round(numRating);
        ratingDistribution[intRating] = (ratingDistribution[intRating] || 0) + 1;
      }

      // Source Channel Detection
      const rawSource = (r.sourceUrl || r.externalReviewId || 'GOOGLE').toUpperCase();
      let detectedSource = 'GOOGLE';
      if (rawSource.includes('YELP')) detectedSource = 'YELP';
      else if (rawSource.includes('OPENTABLE')) detectedSource = 'OPENTABLE';
      else if (rawSource.includes('TRIPADVISOR')) detectedSource = 'TRIPADVISOR';
      sourceDistribution[detectedSource] = (sourceDistribution[detectedSource] || 0) + 1;

      // Date Range Tracking
      if (r.publishedAt) {
        const d = new Date(r.publishedAt);
        if (!isNaN(d.getTime())) {
          if (!earliestDate || d < earliestDate) earliestDate = d;
          if (!latestDate || d > latestDate) latestDate = d;
        }
      }

      // Deduplication Detection
      const extId = r.externalReviewId ? String(r.externalReviewId).trim() : null;
      const pubDate = r.publishedAt ? new Date(r.publishedAt) : null;
      const hash = computeReviewContentHash(rawText, pubDate, r.authorName);

      if ((extId && existingExtIds.has(extId)) || existingHashes.has(hash) || (extId && seenBatchExtIds.has(extId)) || seenBatchHashes.has(hash)) {
        duplicateRows++;
        continue;
      }

      if (extId) seenBatchExtIds.add(extId);
      seenBatchHashes.add(hash);
      acceptedRows++;
    }

    return NextResponse.json({
      success: true,
      totalRows: rows.length,
      acceptedRows,
      duplicateRows,
      invalidRows,
      invalidReasons: invalidReasons.slice(0, 10),
      locationResolution: {
        status: resolutionStatus,
        matchedLocationId: matchedLocation?.id || null,
        matchedLocationName: matchedLocation?.name || null,
        brasaLocationId: matchedLocation?.brasaLocationId || brasaLocationId || null
      },
      sourceDistribution,
      ratingDistribution,
      dateRange: {
        earliest: earliestDate ? earliestDate.toISOString() : null,
        latest: latestDate ? latestDate.toISOString() : null
      }
    });
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('SCOPE_ACCESS_DENIED') || err?.message?.includes('Scope access denied')) {
      return NextResponse.json({ error: 'Scope access denied' }, { status: 403 });
    }
    console.error('Review import preview error:', err);
    return NextResponse.json({ error: err?.message || 'Error executing import preview' }, { status: 500 });
  }
}
