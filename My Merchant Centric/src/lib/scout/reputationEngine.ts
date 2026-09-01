import { db } from '@/lib/db';
import { SourceSnapshot } from '@prisma/client';

export type VelocityDirection = 'ACCELERATING' | 'STABLE' | 'DECELERATING' | 'INSUFFICIENT_DATA';
export type RatingDirection = 'IMPROVING' | 'STABLE' | 'DECLINING' | 'INSUFFICIENT_DATA';
export type EventSeverity = 'INFO' | 'WATCH' | 'ALERT';

export interface VelocityMetrics {
  reviewsAdded7d: number;
  reviewsAdded30d: number;
  avgReviewsPerDay7d: number;
  avgReviewsPerDay30d: number;
  velocityDeltaPct: number;
  direction: VelocityDirection;
}

export interface RatingTrendMetrics {
  currentRating: number | null;
  rating7dAgo: number | null;
  rating30dAgo: number | null;
  ratingChange7d: number | null;
  ratingChange30d: number | null;
  direction: RatingDirection;
}

/**
 * Calculates review velocity based on historical snapshots.
 * Does not fabricate zeros; returns INSUFFICIENT_DATA if snapshot history is insufficient.
 */
export function calculateReviewVelocity(snapshots: SourceSnapshot[]): VelocityMetrics {
  if (!snapshots || snapshots.length < 2) {
    return {
      reviewsAdded7d: 0,
      reviewsAdded30d: 0,
      avgReviewsPerDay7d: 0,
      avgReviewsPerDay30d: 0,
      velocityDeltaPct: 0,
      direction: 'INSUFFICIENT_DATA',
    };
  }

  // Sort descending by capturedAt
  const sorted = [...snapshots].sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
  const latest = sorted[0];
  const now = new Date(latest.capturedAt).getTime();

  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;

  const snap7d = sorted.find(s => new Date(s.capturedAt).getTime() <= sevenDaysAgo) || sorted[sorted.length - 1];
  const snap30d = sorted.find(s => new Date(s.capturedAt).getTime() <= thirtyDaysAgo) || sorted[sorted.length - 1];
  const snap60d = sorted.find(s => new Date(s.capturedAt).getTime() <= sixtyDaysAgo);

  const reviewsLatest = latest.reviewCount || 0;
  const reviews7d = snap7d.reviewCount || 0;
  const reviews30d = snap30d.reviewCount || 0;

  const reviewsAdded7d = Math.max(0, reviewsLatest - reviews7d);
  const reviewsAdded30d = Math.max(0, reviewsLatest - reviews30d);

  const daysDiff7d = Math.max(1, (now - new Date(snap7d.capturedAt).getTime()) / (1000 * 60 * 60 * 24));
  const daysDiff30d = Math.max(1, (now - new Date(snap30d.capturedAt).getTime()) / (1000 * 60 * 60 * 24));

  const avgReviewsPerDay7d = parseFloat((reviewsAdded7d / daysDiff7d).toFixed(2));
  const avgReviewsPerDay30d = parseFloat((reviewsAdded30d / daysDiff30d).toFixed(2));

  let velocityDeltaPct = 0;
  let direction: VelocityDirection = 'STABLE';

  if (snap60d) {
    const reviews60d = snap60d.reviewCount || 0;
    const previousPeriodAdded = Math.max(0, reviews30d - reviews60d);
    if (previousPeriodAdded > 0) {
      velocityDeltaPct = parseFloat((((reviewsAdded30d - previousPeriodAdded) / previousPeriodAdded) * 100).toFixed(1));
    } else if (reviewsAdded30d > 0) {
      velocityDeltaPct = 100;
    }
  } else if (avgReviewsPerDay30d > 0) {
    if (avgReviewsPerDay7d > avgReviewsPerDay30d * 1.2) {
      velocityDeltaPct = parseFloat((((avgReviewsPerDay7d - avgReviewsPerDay30d) / avgReviewsPerDay30d) * 100).toFixed(1));
    } else if (avgReviewsPerDay7d < avgReviewsPerDay30d * 0.8) {
      velocityDeltaPct = parseFloat((((avgReviewsPerDay7d - avgReviewsPerDay30d) / avgReviewsPerDay30d) * 100).toFixed(1));
    }
  }

  if (velocityDeltaPct > 15 || avgReviewsPerDay7d > avgReviewsPerDay30d * 1.3) {
    direction = 'ACCELERATING';
  } else if (velocityDeltaPct < -15 || avgReviewsPerDay7d < avgReviewsPerDay30d * 0.7) {
    direction = 'DECELERATING';
  }

  return {
    reviewsAdded7d,
    reviewsAdded30d,
    avgReviewsPerDay7d,
    avgReviewsPerDay30d,
    velocityDeltaPct,
    direction,
  };
}

/**
 * Calculates rating trend metrics based on historical snapshots.
 */
export function calculateRatingTrend(snapshots: SourceSnapshot[]): RatingTrendMetrics {
  if (!snapshots || snapshots.length === 0) {
    return {
      currentRating: null,
      rating7dAgo: null,
      rating30dAgo: null,
      ratingChange7d: null,
      ratingChange30d: null,
      direction: 'INSUFFICIENT_DATA',
    };
  }

  const sorted = [...snapshots].sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
  const latest = sorted[0];
  const currentRating = latest.rating;

  if (snapshots.length < 2 || currentRating === null) {
    return {
      currentRating,
      rating7dAgo: null,
      rating30dAgo: null,
      ratingChange7d: null,
      ratingChange30d: null,
      direction: 'INSUFFICIENT_DATA',
    };
  }

  const now = new Date(latest.capturedAt).getTime();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const snap7d = sorted.find(s => new Date(s.capturedAt).getTime() <= sevenDaysAgo);
  const snap30d = sorted.find(s => new Date(s.capturedAt).getTime() <= thirtyDaysAgo) || sorted[sorted.length - 1];

  const rating7dAgo = snap7d?.rating ?? null;
  const rating30dAgo = snap30d?.rating ?? null;

  const ratingChange7d = rating7dAgo !== null && currentRating !== null ? parseFloat((currentRating - rating7dAgo).toFixed(2)) : null;
  const ratingChange30d = rating30dAgo !== null && currentRating !== null ? parseFloat((currentRating - rating30dAgo).toFixed(2)) : null;

  let direction: RatingDirection = 'STABLE';
  if (ratingChange30d !== null) {
    if (ratingChange30d >= 0.1) direction = 'IMPROVING';
    else if (ratingChange30d <= -0.1) direction = 'DECLINING';
  } else if (ratingChange7d !== null) {
    if (ratingChange7d >= 0.1) direction = 'IMPROVING';
    else if (ratingChange7d <= -0.1) direction = 'DECLINING';
  }

  return {
    currentRating,
    rating7dAgo,
    rating30dAgo,
    ratingChange7d,
    ratingChange30d,
    direction,
  };
}

/**
 * Evaluates snapshot deltas and records structured ReputationEvents into the database.
 */
export async function evaluateReputationEvents(params: {
  externalSourceId: string;
  currentSnapshot: SourceSnapshot;
  previousSnapshot: SourceSnapshot | null;
  allSnapshots?: SourceSnapshot[];
}): Promise<any[]> {
  const { externalSourceId, currentSnapshot, previousSnapshot, allSnapshots = [] } = params;

  const source = await db.externalSource.findUnique({
    where: { id: externalSourceId }
  });
  if (!source) return [];

  const eventsToCreate: Array<{
    organizationId: string;
    locationId: string | null;
    competitorLocationId: string | null;
    externalSourceId: string;
    provider: string;
    eventType: string;
    severity: EventSeverity;
    previousValue: any;
    currentValue: any;
    delta: any;
    evidenceSnapshotId: string;
    metadata: any;
  }> = [];

  if (!previousSnapshot) {
    // Baseline established event
    eventsToCreate.push({
      organizationId: source.organizationId,
      locationId: source.locationId,
      competitorLocationId: source.competitorLocationId,
      externalSourceId,
      provider: source.provider,
      eventType: 'BASELINE_ESTABLISHED',
      severity: 'INFO',
      previousValue: null,
      currentValue: {
        rating: currentSnapshot.rating,
        reviewCount: currentSnapshot.reviewCount,
        businessStatus: currentSnapshot.businessStatus,
      },
      delta: null,
      evidenceSnapshotId: currentSnapshot.id,
      metadata: { message: 'Baseline snapshot established for source monitoring.' }
    });
  } else {
    // Rating changes
    const prevRating = previousSnapshot.rating ?? 0;
    const currRating = currentSnapshot.rating ?? 0;
    const ratingDelta = parseFloat((currRating - prevRating).toFixed(2));

    if (ratingDelta >= 0.1) {
      eventsToCreate.push({
        organizationId: source.organizationId,
        locationId: source.locationId,
        competitorLocationId: source.competitorLocationId,
        externalSourceId,
        provider: source.provider,
        eventType: 'RATING_INCREASED',
        severity: 'INFO',
        previousValue: { rating: prevRating },
        currentValue: { rating: currRating },
        delta: { ratingChange: ratingDelta },
        evidenceSnapshotId: currentSnapshot.id,
        metadata: { message: `Rating increased from ${prevRating} to ${currRating}` }
      });
    } else if (ratingDelta <= -0.1) {
      const severity: EventSeverity = ratingDelta <= -0.2 ? 'ALERT' : 'WATCH';
      eventsToCreate.push({
        organizationId: source.organizationId,
        locationId: source.locationId,
        competitorLocationId: source.competitorLocationId,
        externalSourceId,
        provider: source.provider,
        eventType: 'RATING_DECREASED',
        severity,
        previousValue: { rating: prevRating },
        currentValue: { rating: currRating },
        delta: { ratingChange: ratingDelta },
        evidenceSnapshotId: currentSnapshot.id,
        metadata: { message: `Rating decreased from ${prevRating} to ${currRating}` }
      });
    }

    // Review count changes
    const prevReviews = previousSnapshot.reviewCount ?? 0;
    const currReviews = currentSnapshot.reviewCount ?? 0;
    const reviewsDelta = currReviews - prevReviews;

    if (reviewsDelta > 0) {
      eventsToCreate.push({
        organizationId: source.organizationId,
        locationId: source.locationId,
        competitorLocationId: source.competitorLocationId,
        externalSourceId,
        provider: source.provider,
        eventType: 'REVIEW_COUNT_INCREASED',
        severity: 'INFO',
        previousValue: { reviewCount: prevReviews },
        currentValue: { reviewCount: currReviews },
        delta: { reviewsAdded: reviewsDelta },
        evidenceSnapshotId: currentSnapshot.id,
        metadata: { message: `Review count increased by +${reviewsDelta} (${prevReviews} → ${currReviews})` }
      });
    }

    // Business Status changes
    const prevStatus = previousSnapshot.businessStatus;
    const currStatus = currentSnapshot.businessStatus;

    if (prevStatus && currStatus && prevStatus !== currStatus) {
      const severity: EventSeverity = currStatus !== 'OPERATIONAL' ? 'ALERT' : 'WATCH';
      eventsToCreate.push({
        organizationId: source.organizationId,
        locationId: source.locationId,
        competitorLocationId: source.competitorLocationId,
        externalSourceId,
        provider: source.provider,
        eventType: 'BUSINESS_STATUS_CHANGED',
        severity,
        previousValue: { businessStatus: prevStatus },
        currentValue: { businessStatus: currStatus },
        delta: { statusFrom: prevStatus, statusTo: currStatus },
        evidenceSnapshotId: currentSnapshot.id,
        metadata: { message: `Business status changed from ${prevStatus} to ${currStatus}` }
      });
    }

    // Velocity spike evaluation
    if (allSnapshots.length >= 3) {
      const velocity = calculateReviewVelocity(allSnapshots);
      if (velocity.direction === 'ACCELERATING' && velocity.velocityDeltaPct > 50) {
        const isRatingDeclining = ratingDelta < 0;
        eventsToCreate.push({
          organizationId: source.organizationId,
          locationId: source.locationId,
          competitorLocationId: source.competitorLocationId,
          externalSourceId,
          provider: source.provider,
          eventType: 'REVIEW_VELOCITY_SPIKE',
          severity: isRatingDeclining ? 'ALERT' : 'WATCH',
          previousValue: { velocityDirection: 'STABLE' },
          currentValue: { velocityDirection: velocity.direction },
          delta: { velocityDeltaPct: velocity.velocityDeltaPct },
          evidenceSnapshotId: currentSnapshot.id,
          metadata: { message: `Review velocity spiked by +${velocity.velocityDeltaPct}%` }
        });
      }
    }
  }

  // Persist created events to DB
  const created: any[] = [];
  for (const evt of eventsToCreate) {
    const item = await db.reputationEvent.create({
      data: evt
    });
    created.push(item);
  }

  return created;
}
