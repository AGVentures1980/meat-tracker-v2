import { db } from '@/lib/db';
import { GooglePlacesAdapter } from '@/lib/scout/adapters/googlePlacesAdapter';
import { checkSourcePolicy, recalculateDataCoverage } from '@/lib/services/scoutService';
import { AcquisitionMethod, CoverageType } from '@prisma/client';
import { evaluateReputationEvents } from '@/lib/scout/reputationEngine';

export interface EligibilityResult {
  eligible: boolean;
  reason?: 'SOURCE_NOT_CONFIRMED' | 'MONITORING_DISABLED' | 'ADAPTER_NOT_OPERATIONAL' | 'BLOCKED_BY_SOURCE_POLICY' | 'INVALID_PLACE_ID';
}

/**
 * Validates whether an ExternalSource is eligible for automated monitoring.
 */
export async function checkMonitoringEligibility(sourceId: string): Promise<EligibilityResult> {
  const source = await db.externalSource.findUnique({
    where: { id: sourceId }
  });

  if (!source) {
    return { eligible: false, reason: 'SOURCE_NOT_CONFIRMED' };
  }

  // Status check: must be CONFIRMED or MONITORING
  if (source.status !== 'CONFIRMED' && source.status !== 'MONITORING') {
    return { eligible: false, reason: 'SOURCE_NOT_CONFIRMED' };
  }

  // Monitoring enabled check
  if (!source.monitoringEnabled) {
    return { eligible: false, reason: 'MONITORING_DISABLED' };
  }

  // Place ID check
  if (!source.externalLocationId || source.externalLocationId.trim().length === 0) {
    return { eligible: false, reason: 'INVALID_PLACE_ID' };
  }

  // Source Policy check
  const isAllowed = await checkSourcePolicy(source.provider, 'allowAutomatedMonitoring');
  if (!isAllowed) {
    return { eligible: false, reason: 'BLOCKED_BY_SOURCE_POLICY' };
  }

  // Adapter Operational Status check
  if (source.provider === 'GOOGLE') {
    const placesAdapter = new GooglePlacesAdapter();
    const status = placesAdapter.getAdapterStatus();
    if (status === 'NOT_CONFIGURED') {
      return { eligible: false, reason: 'ADAPTER_NOT_OPERATIONAL' };
    }
  }

  return { eligible: true };
}

/**
 * Calculates and updates the next scheduled check timestamp for a source.
 */
export async function updateMonitoringSchedule(sourceId: string, isSuccess: boolean) {
  const source = await db.externalSource.findUnique({ where: { id: sourceId } });
  if (!source) return;

  const now = new Date();
  // Cadence rules: competitor sources = 24h (max 1 check/day), owned = 12h (max 2 checks/day)
  const baseHours = source.isCompetitor ? 24 : 12;
  const frequencyHours = source.monitoringFrequencyHours || baseHours;

  let nextCheck: Date;
  if (isSuccess) {
    nextCheck = new Date(now.getTime() + frequencyHours * 60 * 60 * 1000);
  } else {
    // Exponential backoff for failures: 1h, 2h, 4h, max 24h
    const backoffHours = Math.min(24, Math.pow(2, source.consecutiveFailures));
    nextCheck = new Date(now.getTime() + backoffHours * 60 * 60 * 1000);
  }

  await db.externalSource.update({
    where: { id: sourceId },
    data: {
      nextCheckAt: nextCheck,
      lastAttemptAt: now,
      lastSuccessfulCheckAt: isSuccess ? now : source.lastSuccessfulCheckAt,
      consecutiveFailures: isSuccess ? 0 : source.consecutiveFailures + 1,
      monitoringStatus: isSuccess ? 'ACTIVE' : (source.consecutiveFailures >= 3 ? 'ERROR' : 'ACTIVE')
    }
  });
}

/**
 * Executes an automated monitoring run for a specific ExternalSource.
 */
export async function executeScheduledMonitoringRun(sourceId: string, forceCheck: boolean = false) {
  const now = new Date();

  const source = await db.externalSource.findUnique({
    where: { id: sourceId }
  });

  if (!source) {
    throw new Error(`SOURCE_NOT_FOUND: Source ${sourceId} does not exist.`);
  }

  // 1. Eligibility Check
  const eligibility = await checkMonitoringEligibility(sourceId);
  if (!eligibility.eligible) {
    await db.ingestionRun.create({
      data: {
        organizationId: source.organizationId,
        locationId: source.locationId,
        competitorLocationId: source.competitorLocationId,
        externalSourceId: source.id,
        provider: source.provider,
        acquisitionMethod: AcquisitionMethod.OFFICIAL_API,
        coverageType: CoverageType.METADATA_ONLY,
        status: 'BLOCKED',
        completedAt: now,
        errorCode: eligibility.reason,
        errorMessage: `Monitoring skipped: ${eligibility.reason}`,
        metadata: { adapter: 'GOOGLE_PLACES', action: 'MONITOR_SKIPPED', reason: eligibility.reason }
      }
    });

    if (eligibility.reason === 'ADAPTER_NOT_OPERATIONAL') {
      await db.externalSource.update({
        where: { id: sourceId },
        data: { monitoringStatus: 'ADAPTER_UNAVAILABLE' }
      });
    } else if (eligibility.reason === 'MONITORING_DISABLED') {
      await db.externalSource.update({
        where: { id: sourceId },
        data: { monitoringStatus: 'PAUSED' }
      });
    }
    return { status: 'SKIPPED', reason: eligibility.reason };
  }

  // 2. Schedule Due Check
  if (!forceCheck && source.nextCheckAt && source.nextCheckAt > now) {
    return { status: 'NOT_DUE', nextCheckAt: source.nextCheckAt };
  }

  // 3. Create IngestionRun entry
  const ingestionRun = await db.ingestionRun.create({
    data: {
      organizationId: source.organizationId,
      locationId: source.locationId,
      competitorLocationId: source.competitorLocationId,
      externalSourceId: source.id,
      provider: source.provider,
      acquisitionMethod: AcquisitionMethod.OFFICIAL_API,
      coverageType: CoverageType.METADATA_ONLY,
      status: 'RUNNING',
      startedAt: now,
      metadata: { adapter: 'GOOGLE_PLACES', action: 'MONITOR' }
    }
  });

  try {
    const placesAdapter = new GooglePlacesAdapter();
    const details = await placesAdapter.getPlaceDetails(source.externalLocationId!);

    const rating = details.rating || null;
    const reviewCount = details.userRatingCount || null;
    const businessStatus = details.businessStatus || 'OPERATIONAL';

    // Get latest snapshot for comparison
    const latestSnapshot = await db.sourceSnapshot.findFirst({
      where: { externalSourceId: sourceId },
      orderBy: { capturedAt: 'desc' }
    });

    const allSnapshots = await db.sourceSnapshot.findMany({
      where: { externalSourceId: sourceId },
      orderBy: { capturedAt: 'desc' }
    });

    let snapshotCreated = false;
    let newSnapshot: any = null;

    // Check if meaningful tracked values changed
    const hasChanged = !latestSnapshot ||
      latestSnapshot.rating !== rating ||
      latestSnapshot.reviewCount !== reviewCount ||
      latestSnapshot.businessStatus !== businessStatus;

    if (hasChanged) {
      newSnapshot = await db.sourceSnapshot.create({
        data: {
          organizationId: source.organizationId,
          locationId: source.locationId,
          competitorLocationId: source.competitorLocationId,
          externalSourceId: source.id,
          rating,
          reviewCount,
          businessStatus,
          adapter: 'GOOGLE_PLACES',
          acquisitionMethod: AcquisitionMethod.OFFICIAL_API,
          coverageType: CoverageType.METADATA_ONLY,
          capturedAt: now,
        }
      });
      snapshotCreated = true;

      // Evaluate Reputation Events
      await evaluateReputationEvents({
        externalSourceId: source.id,
        currentSnapshot: newSnapshot,
        previousSnapshot: latestSnapshot,
        allSnapshots: [newSnapshot, ...allSnapshots]
      });
    }

    // Update lastCheckedAt on ExternalSource
    await db.externalSource.update({
      where: { id: source.id },
      data: {
        lastCheckedAt: now,
        status: 'MONITORING',
        monitoringStatus: 'ACTIVE'
      }
    });

    // Update Data Coverage
    await recalculateDataCoverage(source.organizationId, source.locationId, source.competitorLocationId, source.provider);

    // Update IngestionRun as completed
    await db.ingestionRun.update({
      where: { id: ingestionRun.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        rawItemsReceived: 1,
        normalizedItems: 1,
        deduplicatedItems: snapshotCreated ? 0 : 1,
        acceptedItems: snapshotCreated ? 1 : 0
      }
    });

    // Reschedule next check
    await updateMonitoringSchedule(source.id, true);

    return {
      status: 'SUCCESS',
      snapshotCreated,
      rating,
      reviewCount,
      businessStatus,
      lastCheckedAt: now
    };
  } catch (err: any) {
    console.error(`Monitoring run failed for source ${sourceId}:`, err);

    await db.ingestionRun.update({
      where: { id: ingestionRun.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorCode: 'GOOGLE_PLACES_PROVIDER_ERROR',
        errorMessage: err.message || 'Provider request failed'
      }
    });

    await updateMonitoringSchedule(source.id, false);
    throw err;
  }
}
