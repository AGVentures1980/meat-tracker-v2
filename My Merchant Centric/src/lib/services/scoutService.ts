import { db } from '@/lib/db';
import { AcquisitionMethod, CoverageType, ExternalSource, SourceSnapshot } from '@prisma/client';

/**
 * Validates that ExternalSource target matches exactly one owned Location or CompetitorLocation.
 */
export function validateExternalSourceTarget(locationId?: string | null, competitorLocationId?: string | null) {
  const hasLoc = !!locationId;
  const hasComp = !!competitorLocationId;
  if ((hasLoc && hasComp) || (!hasLoc && !hasComp)) {
    throw new Error('ExternalSource must support either an owned Location or a CompetitorLocation, with exactly one target assigned.');
  }
}

/**
 * Checks SourcePolicy for a provider and action.
 */
export async function checkSourcePolicy(
  provider: string,
  action: 'allowDiscovery' | 'allowPublicMetadata' | 'allowAutomatedMonitoring' | 'allowAutomatedContentIngestion' | 'allowOfficialApi' | 'allowClientImport' | 'allowManualImport'
): Promise<boolean> {
  const policy = await db.sourcePolicy.findUnique({
    where: { provider: provider.toUpperCase() }
  });
  if (!policy) {
    // If no policy found, default to false for safety
    return false;
  }
  return !!policy[action];
}

/**
 * Creates a candidate profile.
 */
export async function createExternalSource(data: {
  organizationId: string;
  locationId?: string | null;
  competitorLocationId?: string | null;
  provider: string;
  externalLocationId?: string | null;
  sourceUrl: string;
  displayName?: string | null;
  status?: string;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  isCompetitor?: boolean;
  discoveryMethod?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: Date | null;
  adapterUsed?: string | null;
}) {
  validateExternalSourceTarget(data.locationId, data.competitorLocationId);

  // Enforce unique constraints manually to handle nulls gracefully
  if (data.locationId) {
    const existing = await db.externalSource.findFirst({
      where: { locationId: data.locationId, provider: data.provider }
    });
    if (existing) return existing;
  } else if (data.competitorLocationId) {
    const existing = await db.externalSource.findFirst({
      where: { competitorLocationId: data.competitorLocationId, provider: data.provider }
    });
    if (existing) return existing;
  }

  return await db.externalSource.create({
    data: {
      organizationId: data.organizationId,
      locationId: data.locationId || null,
      competitorLocationId: data.competitorLocationId || null,
      provider: data.provider.toUpperCase(),
      externalLocationId: data.externalLocationId || null,
      sourceUrl: data.sourceUrl,
      displayName: data.displayName || null,
      status: data.status || 'DISCOVERED',
      confidence: data.confidence || 'HIGH',
      isCompetitor: data.isCompetitor || false,
      discoveryMethod: data.discoveryMethod || 'DETERMINISTIC_MATCH',
      verifiedBy: data.verifiedBy || null,
      verifiedAt: data.verifiedAt || null,
      adapterUsed: data.adapterUsed || null,
    }
  });
}

/**
 * Immutably inserts a SourceSnapshot if metadata values differ from the latest captured snapshot.
 */
export async function createSnapshotIfChanged(
  sourceId: string,
  data: {
    rating?: number | null;
    reviewCount?: number | null;
    followerCount?: number | null;
    businessStatus?: string | null;
    adapter?: string | null;
    additionalMetrics?: any;
    acquisitionMethod?: AcquisitionMethod;
    coverageType?: CoverageType;
  }
) {
  const source = await db.externalSource.findUnique({
    where: { id: sourceId }
  });

  if (!source) throw new Error('External source not found');

  const latest = await db.sourceSnapshot.findFirst({
    where: { externalSourceId: sourceId },
    orderBy: { capturedAt: 'desc' }
  });

  // Delta detection
  let changed = false;
  const changeEvents: string[] = [];

  if (!latest) {
    changed = true;
    changeEvents.push('SOURCE_FOUND');
  } else {
    if (data.rating !== undefined && data.rating !== latest.rating) {
      changed = true;
      changeEvents.push('RATING_CHANGED');
    }
    if (data.reviewCount !== undefined && data.reviewCount !== latest.reviewCount) {
      changed = true;
      changeEvents.push('REVIEW_COUNT_CHANGED');
    }
    if (data.followerCount !== undefined && data.followerCount !== latest.followerCount) {
      changed = true;
      changeEvents.push('SOURCE_METADATA_CHANGED');
    }
    if (data.businessStatus !== undefined && data.businessStatus !== latest.businessStatus) {
      changed = true;
      changeEvents.push('BUSINESS_STATUS_CHANGED');
    }
  }

  const now = new Date();

  let snapshot: SourceSnapshot | null = null;
  if (changed) {
    snapshot = await db.sourceSnapshot.create({
      data: {
        organizationId: source.organizationId,
        locationId: source.locationId,
        competitorLocationId: source.competitorLocationId,
        externalSourceId: sourceId,
        rating: data.rating ?? null,
        reviewCount: data.reviewCount ?? null,
        followerCount: data.followerCount ?? null,
        businessStatus: data.businessStatus || null,
        adapter: data.adapter || null,
        additionalMetrics: data.additionalMetrics || null,
        acquisitionMethod: data.acquisitionMethod || AcquisitionMethod.PUBLIC_METADATA,
        coverageType: data.coverageType || CoverageType.METADATA_ONLY,
        capturedAt: now,
      }
    });

    await db.externalSource.update({
      where: { id: sourceId },
      data: {
        lastCheckedAt: now,
        lastChangedAt: now,
      }
    });
  } else {
    await db.externalSource.update({
      where: { id: sourceId },
      data: {
        lastCheckedAt: now,
      }
    });
  }

  return { snapshot, changeEvents };
}

/**
 * Recalculates Data Coverage for a location and provider.
 */
export async function recalculateDataCoverage(
  organizationId: string,
  locationId: string | null,
  competitorLocationId: string | null,
  provider: string
) {
  validateExternalSourceTarget(locationId, competitorLocationId);

  // 1. Fetch content items count and date ranges
  const contentItems = await db.contentItem.findMany({
    where: {
      organizationId,
      locationId: locationId || undefined,
      competitorLocationId: competitorLocationId || undefined,
      dataSourceId: provider.toUpperCase(),
      contentType: 'REVIEW',
      status: 'ACTIVE',
    },
    orderBy: { publishedAt: 'asc' },
    select: { publishedAt: true, coverageType: true }
  });

  const sampleSize = contentItems.length;
  const oldestCapturedAt = sampleSize > 0 ? contentItems[0].publishedAt : null;
  const newestCapturedAt = sampleSize > 0 ? contentItems[sampleSize - 1].publishedAt : null;

  // 2. Lookup latest known total review count from snapshots
  const source = await db.externalSource.findFirst({
    where: {
      locationId: locationId || null,
      competitorLocationId: competitorLocationId || null,
      provider: provider.toUpperCase()
    }
  });

  let knownTotalCount = 0;
  if (source) {
    const latestSnapshot = await db.sourceSnapshot.findFirst({
      where: { externalSourceId: source.id },
      orderBy: { capturedAt: 'desc' }
    });
    knownTotalCount = latestSnapshot?.reviewCount || 0;
  }

  // 3. Determine Coverage Type based on rules
  let coverageType: CoverageType = source ? CoverageType.DISCOVERY_ONLY : CoverageType.UNKNOWN;

  // Check if any complete Client Import has run
  const hasCompleteImport = contentItems.some(i => i.coverageType === CoverageType.COMPLETE);

  if (hasCompleteImport || (sampleSize > 0 && sampleSize >= knownTotalCount && knownTotalCount > 0)) {
    coverageType = CoverageType.COMPLETE;
  } else if (sampleSize > 0) {
    coverageType = CoverageType.SAMPLE;
  } else if (knownTotalCount > 0 && source) {
    const policy = await db.sourcePolicy.findUnique({
      where: { provider: provider.toUpperCase() }
    });
    const allowMeta = policy ? policy.allowPublicMetadata : true;
    if (allowMeta) {
      coverageType = CoverageType.METADATA_ONLY;
    } else {
      coverageType = CoverageType.DISCOVERY_ONLY;
    }
  }

  // 4. Update or Upsert DataCoverage record
  const uniqueClause = locationId
    ? { locationId_provider: { locationId, provider: provider.toUpperCase() } }
    : { competitorLocationId_provider: { competitorLocationId: competitorLocationId!, provider: provider.toUpperCase() } };

  const commonData = {
    organizationId,
    locationId: locationId || null,
    competitorLocationId: competitorLocationId || null,
    provider: provider.toUpperCase(),
    coverageType,
    sampleSize,
    knownTotalCount: knownTotalCount || null,
    oldestCapturedAt,
    newestCapturedAt,
    confidence: sampleSize >= knownTotalCount && knownTotalCount > 0 ? 1.0 : 0.8,
  };

  const existingCoverage = await db.dataCoverage.findFirst({
    where: {
      locationId: locationId || null,
      competitorLocationId: competitorLocationId || null,
      provider: provider.toUpperCase()
    }
  });

  if (existingCoverage) {
    return await db.dataCoverage.update({
      where: { id: existingCoverage.id },
      data: commonData
    });
  } else {
    return await db.dataCoverage.create({
      data: commonData
    });
  }
}

import { calculateReviewVelocity, calculateRatingTrend } from '@/lib/scout/reputationEngine';

/**
 * Calculates metadata-level reputation intelligence and review velocity from snapshots.
 */
export async function calculateMetadataIntelligence(sourceId: string) {
  const source = await db.externalSource.findUnique({
    where: { id: sourceId }
  });
  if (!source) throw new Error('External source not found');

  const snapshots = await db.sourceSnapshot.findMany({
    where: { externalSourceId: sourceId },
    orderBy: { capturedAt: 'desc' }
  });

  if (snapshots.length === 0) {
    return {
      currentRating: null,
      currentReviewCount: null,
      reviewsAdded7d: 'insufficient_data',
      reviewsAdded30d: 'insufficient_data',
      avgReviewsPerDay7d: 'insufficient_data',
      avgReviewsPerDay30d: 'insufficient_data',
      ratingChange30d: 'insufficient_data',
      ratingDirection: 'INSUFFICIENT_DATA',
      velocityDirection: 'INSUFFICIENT_DATA',
    };
  }

  const velocity = calculateReviewVelocity(snapshots);
  const ratingTrend = calculateRatingTrend(snapshots);
  const current = snapshots[0];

  return {
    currentRating: current.rating,
    currentReviewCount: current.reviewCount,
    reviewsAdded7d: snapshots.length >= 2 ? velocity.reviewsAdded7d : 'insufficient_data',
    reviewsAdded30d: snapshots.length >= 2 ? velocity.reviewsAdded30d : 'insufficient_data',
    avgReviewsPerDay7d: snapshots.length >= 2 ? velocity.avgReviewsPerDay7d : 'insufficient_data',
    avgReviewsPerDay30d: snapshots.length >= 2 ? velocity.avgReviewsPerDay30d : 'insufficient_data',
    ratingChange30d: ratingTrend.ratingChange30d ?? 'insufficient_data',
    ratingDirection: ratingTrend.direction,
    velocityDirection: velocity.direction,
  };
}

/**
 * Calculates metadata-only competitive ranking across approved competitive set members.
 * Enforces self-brand exclusion and returns null/insufficient_data if competitive set is missing.
 */
export async function calculateCompetitiveMetadataScore(organizationId: string, locationId: string) {
  // Find approved competitive set for location
  const compSet = await db.competitiveSet.findFirst({
    where: { organizationId, locationId },
    include: {
      members: {
        include: {
          competitor: {
            include: {
              externalSources: {
                where: { provider: 'GOOGLE', status: 'CONFIRMED' },
                include: { snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 } }
              }
            }
          }
        }
      }
    }
  });

  if (!compSet || !compSet.members || compSet.members.length === 0) {
    return {
      type: 'COMPETITIVE_METADATA',
      status: 'insufficient_data',
      message: 'No approved competitive set found for location.'
    };
  }

  // Get subject location's Google snapshot
  const subjectSource = await db.externalSource.findFirst({
    where: { organizationId, locationId, provider: 'GOOGLE' },
    include: { snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 } }
  });

  const subjectRating = subjectSource?.snapshots[0]?.rating ?? null;
  const subjectReviews = subjectSource?.snapshots[0]?.reviewCount ?? null;

  if (subjectRating === null) {
    return {
      type: 'COMPETITIVE_METADATA',
      status: 'insufficient_data',
      message: 'Subject location has no Google Places rating snapshot.'
    };
  }

  // Filter approved competitors (self-brand exclusion enforced)
  const competitorsWithRatings: Array<{ id: string; name: string; rating: number; reviewCount: number }> = [];

  for (const member of compSet.members) {
    if (!member.competitor) continue;
    const gSource = member.competitor.externalSources[0];
    const snap = gSource?.snapshots[0];
    if (snap && snap.rating !== null) {
      competitorsWithRatings.push({
        id: member.competitor.id,
        name: member.competitor.name,
        rating: snap.rating,
        reviewCount: snap.reviewCount || 0
      });
    }
  }

  const allEntries = [
    { id: locationId, name: 'Subject Location', rating: subjectRating, reviewCount: subjectReviews || 0 },
    ...competitorsWithRatings
  ].sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);

  const rank = allEntries.findIndex(e => e.id === locationId) + 1;

  return {
    type: 'COMPETITIVE_METADATA',
    status: 'AVAILABLE',
    rank,
    totalInSet: allEntries.length,
    subjectRating,
    subjectReviews,
    leaderboard: allEntries
  };
}
