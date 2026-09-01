import { db } from './db';
import { SentimentValue, CaseStatus } from '@prisma/client';
import { decryptCredentialString } from './connectors/google';

export interface ScoreBreakdown {
  reputation: number | null;
  sentiment: number | null;
  competitive: number | null;
  momentum: number | null;
  response: number | null;
  recovery: number | null;
  brandPulse: number | null;
  dataConfidence: number;
}

/**
 * Calculates the recency decay weight based on age in days.
 */
export function getRecencyWeight(ageInDays: number): number {
  if (ageInDays <= 30) return 1.00;
  if (ageInDays <= 90) return 0.75;
  if (ageInDays <= 180) return 0.50;
  if (ageInDays <= 365) return 0.25;
  return 0.00;
}

/**
 * Normalizes star ratings to 0-100 scale: (rating - 1) / 4 * 100.
 */
export function normalizeRating(rating: number): number {
  return ((rating - 1) / 4) * 100;
}

/**
 * Calculates all components of the Brand Pulse Score for a location over a given period.
 */
export async function calculateLocationScore(
  organizationId: string,
  locationId: string,
  startDate: Date,
  endDate: Date
): Promise<ScoreBreakdown> {
  const now = new Date();

  // Dynamic Live vs. Demo Mode Isolation Helper
  let isLiveMode = false;
  const liveIntegration = await db.integration.findFirst({
    where: {
      organizationId,
      dataSourceId: 'GOOGLE',
      status: 'ACTIVE',
      credentialsReference: { not: null }
    }
  });

  if (liveIntegration && liveIntegration.credentialsReference) {
    try {
      const aad = `${organizationId}:${liveIntegration.id}:GOOGLE`;
      const decrypted = decryptCredentialString(liveIntegration.credentialsReference, aad);
      const parsed = JSON.parse(decrypted);
      if (parsed && !parsed.mockMode) {
        isLiveMode = true;
      }
    } catch (e) {
      // Ignore decrypt failures
    }
  }

  const provenanceModes = isLiveMode ? ['LIVE', 'IMPORTED'] : ['DEMO'];

  // Check DataCoverage for safeguards
  const coverages = await db.dataCoverage.findMany({
    where: {
      OR: [
        { locationId },
        { competitorLocationId: locationId }
      ]
    }
  });

  const isSampleOrMetadataOnly = coverages.some(c =>
    c.coverageType === 'SAMPLE' ||
    c.coverageType === 'METADATA_ONLY' ||
    c.coverageType === 'DISCOVERY_ONLY' ||
    c.coverageType === 'UNKNOWN'
  );
  const isPartial = coverages.some(c => c.coverageType === 'PARTIAL');

  // 1. REPUTATION SCORE (based on star reviews)
  const reviews = isSampleOrMetadataOnly ? [] : await db.contentItem.findMany({
    where: {
      organizationId,
      locationId,
      contentType: 'REVIEW',
      publishedAt: { gte: startDate, lte: endDate },
      rating: { not: null },
      status: 'ACTIVE',
      provenanceMode: { in: provenanceModes }
    },
    select: {
      rating: true,
      publishedAt: true,
    },
  });

  let reputationScore: number | null = null;
  if (!isSampleOrMetadataOnly && reviews.length > 0) {
    let totalReputationWeight = 0;
    let weightedReputationSum = 0;

    reviews.forEach((review) => {
      const ageInMs = now.getTime() - new Date(review.publishedAt).getTime();
      const ageInDays = Math.max(0, ageInMs / (1000 * 60 * 60 * 24));
      const weight = getRecencyWeight(ageInDays);
      const ratingVal = review.rating || 5;
      const normalized = normalizeRating(ratingVal);
      
      weightedReputationSum += normalized * weight;
      totalReputationWeight += weight;
    });

    reputationScore = totalReputationWeight > 0 ? weightedReputationSum / totalReputationWeight : 80.0;
  }

  // 2. SENTIMENT SCORE
  const sentimentAnalyses = isSampleOrMetadataOnly ? [] : await db.sentimentAnalysis.findMany({
    where: {
      contentItem: {
        organizationId,
        locationId,
        publishedAt: { gte: startDate, lte: endDate },
        status: 'ACTIVE',
        provenanceMode: { in: provenanceModes }
      },
    },
    select: {
      overallSentiment: true,
    },
  });

  let sentimentScore: number | null = null;
  if (!isSampleOrMetadataOnly && sentimentAnalyses.length > 0) {
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    sentimentAnalyses.forEach((sa) => {
      if (sa.overallSentiment === SentimentValue.POSITIVE) positiveCount++;
      else if (sa.overallSentiment === SentimentValue.NEGATIVE) negativeCount++;
      else neutralCount++;
    });

    const totalSentimentCount = positiveCount + negativeCount + neutralCount;
    if (totalSentimentCount > 0) {
      const netSentiment = (positiveCount - negativeCount) / totalSentimentCount; // ranges -1 to +1
      sentimentScore = ((netSentiment + 1) / 2) * 100; // normalize to 0-100
    }
  }

  // 3. COMPETITIVE SCORE
  const competitiveSets = await db.competitiveSet.findMany({
    where: {
      organizationId,
      locationId,
      status: 'ACTIVE',
    },
    include: {
      members: {
        where: {
          status: 'APPROVED',
          tier: 'DIRECT',
        },
      },
    },
  });

  const directCompetitorIds = competitiveSets
    .flatMap((cs) => cs.members)
    .map((member) => member.competitorLocationId);

  let competitiveScore: number | null = null;
  if (directCompetitorIds.length > 0) {
    const competitorReviews = await db.contentItem.findMany({
      where: {
        competitorLocationId: { in: directCompetitorIds },
        contentType: 'REVIEW',
        publishedAt: { gte: startDate, lte: endDate },
        rating: { not: null },
        status: 'ACTIVE',
        provenanceMode: { in: provenanceModes }
      },
      select: {
        rating: true,
      },
    });

    if (competitorReviews.length > 0) {
      const ourAverageRating = reviews.length > 0 
        ? reviews.reduce((sum, r) => sum + (r.rating || 5), 0) / reviews.length 
        : 4.0;

      const competitorAverageRating = competitorReviews.reduce((sum, r) => sum + (r.rating || 5), 0) / competitorReviews.length;

      const ratingGap = ourAverageRating - competitorAverageRating; // e.g. ranges -4.0 to +4.0
      competitiveScore = Math.max(0, Math.min(100, 75 + ratingGap * 25)); // 0-100, 75 = tied
    }
  }

  // 4. MOMENTUM SCORE
  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
  const p1Start = new Date(startDate.getTime() - thirtyDaysInMs);
  const p1End = startDate;

  const precedingReviews = isSampleOrMetadataOnly ? [] : await db.contentItem.findMany({
    where: {
      organizationId,
      locationId,
      contentType: 'REVIEW',
      publishedAt: { gte: p1Start, lte: p1End },
      rating: { not: null },
      status: 'ACTIVE',
      provenanceMode: { in: provenanceModes }
    },
    select: { rating: true },
  });

  let momentumScore: number | null = null;
  if (!isSampleOrMetadataOnly && reviews.length > 0 && precedingReviews.length > 0) {
    const currentAverageRating = reviews.reduce((sum, r) => sum + (r.rating || 5), 0) / reviews.length;
    const precedingAverageRating = precedingReviews.reduce((sum, r) => sum + (r.rating || 5), 0) / precedingReviews.length;

    const ratingDelta = currentAverageRating - precedingAverageRating;
    momentumScore = Math.max(0, Math.min(100, 50 + ratingDelta * 50)); // 50 = steady, +1.0 stars = 100
  }

  // 5. RESPONSE SCORE (SLA-aware Response Rate)
  const allReviewsWithResponses = await db.contentItem.findMany({
    where: {
      organizationId,
      locationId,
      contentType: 'REVIEW',
      publishedAt: { gte: startDate, lte: endDate },
      status: 'ACTIVE',
      provenanceMode: { in: provenanceModes }
    },
    include: {
      reviewResponses: true,
    },
  });

  let responseScore: number | null = null;
  if (allReviewsWithResponses.length > 0) {
    let successCount = 0;
    let failureCount = 0;

    allReviewsWithResponses.forEach((review) => {
      const publishedResponse = review.reviewResponses.find(r => r.status === 'PUBLISHED');
      if (publishedResponse) {
        const responseDelayMs = (publishedResponse.publishedAt || now).getTime() - review.publishedAt.getTime();
        const responseDelayHours = responseDelayMs / (1000 * 60 * 60);
        if (responseDelayHours <= 24) {
          successCount++; // RESPONDED_WITHIN_SLA
        } else {
          failureCount++; // RESPONDED_LATE
        }
      } else {
        const ageMs = now.getTime() - review.publishedAt.getTime();
        const ageHours = ageMs / (1000 * 60 * 60);
        if (ageHours > 24) {
          failureCount++; // SLA_BREACHED
        }
        // PENDING_WITHIN_SLA reviews (unanswered and age <= 24h) are excluded from the calculated denominator
      }
    });

    const totalEvaluated = successCount + failureCount;
    if (totalEvaluated > 0) {
      responseScore = (successCount / totalEvaluated) * 100;
    }
  }

  // 6. RECOVERY SCORE (SLA-aware Recovery Resolution)
  const recoveryCases = await db.recoveryCase.findMany({
    where: {
      organizationId,
      locationId,
      openedAt: { gte: startDate, lte: endDate },
      contentItem: {
        provenanceMode: { in: provenanceModes }
      }
    },
  });

  let recoveryScore: number | null = null;
  if (recoveryCases.length > 0) {
    let successCount = 0;
    let failureCount = 0;

    recoveryCases.forEach((c) => {
      if (c.status === CaseStatus.RESOLVED || c.status === CaseStatus.CLOSED) {
        const resolvedTime = c.resolvedAt || c.openedAt;
        if (resolvedTime.getTime() <= c.dueAt.getTime()) {
          successCount++; // RESOLVED_WITHIN_SLA
        } else {
          failureCount++; // RESOLVED_LATE
        }
      } else {
        // OPEN, ASSIGNED, or ESCALATED
        if (now.getTime() > c.dueAt.getTime()) {
          failureCount++; // SLA_BREACHED
        }
        // OPEN_WITHIN_SLA cases are excluded from the calculated denominator
      }
    });

    const totalEvaluated = successCount + failureCount;
    if (totalEvaluated > 0) {
      recoveryScore = (successCount / totalEvaluated) * 100;
    }
  }

  // 7. BRAND PULSE CALCULATION WITH WEIGHT RENORMALIZATION
  const activeConfig = await db.scoringConfiguration.findFirst({
    where: { organizationId },
    orderBy: { effectiveFrom: 'desc' },
  });

  const weights = activeConfig || {
    reputationWeight: 0.35,
    sentimentWeight: 0.25,
    competitiveWeight: 0.15,
    momentumWeight: 0.10,
    responseWeight: 0.10,
    recoveryWeight: 0.05,
  };

  let brandPulse: number | null = null;
  let scorableWeightsSum = 0;
  let weightedPulseSum = 0;

  const componentWeights = [
    { score: reputationScore, weight: weights.reputationWeight },
    { score: sentimentScore, weight: weights.sentimentWeight },
    { score: competitiveScore, weight: weights.competitiveWeight },
    { score: momentumScore, weight: weights.momentumWeight },
    { score: responseScore, weight: weights.responseWeight },
    { score: recoveryScore, weight: weights.recoveryWeight },
  ];

  componentWeights.forEach((comp) => {
    if (comp.score !== null) {
      weightedPulseSum += comp.score * comp.weight;
      scorableWeightsSum += comp.weight;
    }
  });

  if (scorableWeightsSum > 0) {
    brandPulse = weightedPulseSum / scorableWeightsSum;
  }

  // Data confidence check
  const totalItems = reviews.length + sentimentAnalyses.length;
  let dataConfidence = totalItems >= 20 ? 1.0 : totalItems / 20;

  if (isSampleOrMetadataOnly) {
    dataConfidence = 0.0;
  } else if (isPartial) {
    dataConfidence = Math.min(0.7, dataConfidence);
  }

  return {
    reputation: reputationScore !== null ? Math.round(reputationScore * 10) / 10 : null,
    sentiment: sentimentScore !== null ? Math.round(sentimentScore * 10) / 10 : null,
    competitive: competitiveScore !== null ? Math.round(competitiveScore * 10) / 10 : null,
    momentum: momentumScore !== null ? Math.round(momentumScore * 10) / 10 : null,
    response: responseScore !== null ? Math.round(responseScore * 10) / 10 : null,
    recovery: recoveryScore !== null ? Math.round(recoveryScore * 10) / 10 : null,
    brandPulse: brandPulse !== null ? Math.round(brandPulse * 10) / 10 : null,
    dataConfidence,
  };
}

/**
 * Triggers score snapshots updates.
 */
export async function writeScoreSnapshots(
  organizationId: string,
  locationId: string,
  startDate: Date,
  endDate: Date,
  algorithmVersion = '1.0'
) {
  const breakdown = await calculateLocationScore(organizationId, locationId, startDate, endDate);
  
  const scoreTypes = [
    { type: 'BRAND_PULSE', val: breakdown.brandPulse },
    { type: 'REPUTATION', val: breakdown.reputation },
    { type: 'SENTIMENT', val: breakdown.sentiment },
    { type: 'COMPETITIVE', val: breakdown.competitive },
    { type: 'MOMENTUM', val: breakdown.momentum },
    { type: 'RESPONSE', val: breakdown.response },
    { type: 'RECOVERY', val: breakdown.recovery },
  ];

  const activeConfig = await db.scoringConfiguration.findFirst({
    where: { organizationId },
    orderBy: { effectiveFrom: 'desc' },
  });

  const weights = activeConfig || {
    reputationWeight: 0.35,
    sentimentWeight: 0.25,
    competitiveWeight: 0.15,
    momentumWeight: 0.10,
    responseWeight: 0.10,
    recoveryWeight: 0.05,
  };

  // Determine scorable weights sum for normalization tracking
  let scorableWeightsSum = 0;
  if (breakdown.reputation !== null) scorableWeightsSum += weights.reputationWeight;
  if (breakdown.sentiment !== null) scorableWeightsSum += weights.sentimentWeight;
  if (breakdown.competitive !== null) scorableWeightsSum += weights.competitiveWeight;
  if (breakdown.momentum !== null) scorableWeightsSum += weights.momentumWeight;
  if (breakdown.response !== null) scorableWeightsSum += weights.responseWeight;
  if (breakdown.recovery !== null) scorableWeightsSum += weights.recoveryWeight;

  for (const item of scoreTypes) {
    // Find previous score for delta
    const prev = await db.scoreSnapshot.findFirst({
      where: {
        organizationId,
        locationId,
        scoreType: item.type,
      },
      orderBy: { calculatedAt: 'desc' },
    });

    const delta = (prev && prev.score !== null && item.val !== null) ? item.val - prev.score : null;

    const createdSnapshot = await db.scoreSnapshot.create({
      data: {
        organizationId,
        locationId,
        scoreType: item.type,
        periodStart: startDate,
        periodEnd: endDate,
        score: item.val,
        previousScore: prev ? prev.score : null,
        delta,
        algorithmVersion,
        dataConfidence: breakdown.dataConfidence,
      },
    });

    if (item.type === 'BRAND_PULSE') {
      if (breakdown.reputation !== null) {
        await db.scoreComponent.create({
          data: {
            scoreSnapshotId: createdSnapshot.id,
            componentName: 'REPUTATION',
            rawValue: breakdown.reputation,
            normalizedValue: breakdown.reputation,
            weight: weights.reputationWeight,
            contribution: (breakdown.reputation * weights.reputationWeight) / (scorableWeightsSum || 1.0)
          }
        });
      }
      if (breakdown.sentiment !== null) {
        await db.scoreComponent.create({
          data: {
            scoreSnapshotId: createdSnapshot.id,
            componentName: 'SENTIMENT',
            rawValue: breakdown.sentiment,
            normalizedValue: breakdown.sentiment,
            weight: weights.sentimentWeight,
            contribution: (breakdown.sentiment * weights.sentimentWeight) / (scorableWeightsSum || 1.0)
          }
        });
      }
      if (breakdown.competitive !== null) {
        await db.scoreComponent.create({
          data: {
            scoreSnapshotId: createdSnapshot.id,
            componentName: 'COMPETITIVE',
            rawValue: breakdown.competitive,
            normalizedValue: breakdown.competitive,
            weight: weights.competitiveWeight,
            contribution: (breakdown.competitive * weights.competitiveWeight) / (scorableWeightsSum || 1.0)
          }
        });
      }
      if (breakdown.momentum !== null) {
        await db.scoreComponent.create({
          data: {
            scoreSnapshotId: createdSnapshot.id,
            componentName: 'MOMENTUM',
            rawValue: breakdown.momentum,
            normalizedValue: breakdown.momentum,
            weight: weights.momentumWeight,
            contribution: (breakdown.momentum * weights.momentumWeight) / (scorableWeightsSum || 1.0)
          }
        });
      }
      if (breakdown.response !== null) {
        await db.scoreComponent.create({
          data: {
            scoreSnapshotId: createdSnapshot.id,
            componentName: 'RESPONSE',
            rawValue: breakdown.response,
            normalizedValue: breakdown.response,
            weight: weights.responseWeight,
            contribution: (breakdown.response * weights.responseWeight) / (scorableWeightsSum || 1.0)
          }
        });
      }
      if (breakdown.recovery !== null) {
        await db.scoreComponent.create({
          data: {
            scoreSnapshotId: createdSnapshot.id,
            componentName: 'RECOVERY',
            rawValue: breakdown.recovery,
            normalizedValue: breakdown.recovery,
            weight: weights.recoveryWeight,
            contribution: (breakdown.recovery * weights.recoveryWeight) / (scorableWeightsSum || 1.0)
          }
        });
      }
    }
  }
}
