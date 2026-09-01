import { db } from '@/lib/db';
import { checkSourcePolicy, createSnapshotIfChanged } from '../services/scoutService';
import { GooglePlacesAdapter } from '../scout/adapters/googlePlacesAdapter';
import { AcquisitionMethod, CoverageType } from '@prisma/client';

export interface MonitoringResult {
  sourceId: string;
  provider: string;
  checkedAt: Date;
  status: string;
  rating?: number;
  reviewCount?: number;
  eventsRaised: string[];
}

/**
 * Fetches permitted public metadata for Google/Yelp/OpenTable in compliance with SourcePolicies.
 */
export async function fetchPublicMetadata(
  provider: string,
  sourceUrl: string,
  externalLocationId?: string | null
): Promise<{ rating: number; reviewCount: number; businessStatus?: string; adapterUsed?: string }> {
  // Check policy
  const allowed = await checkSourcePolicy(provider, 'allowPublicMetadata');
  if (!allowed) {
    throw new Error(`BLOCKED_BY_SOURCE_POLICY: Public metadata monitoring not allowed for provider ${provider}`);
  }

  if (provider === 'GOOGLE') {
    const placesAdapter = new GooglePlacesAdapter();
    const status = placesAdapter.getAdapterStatus();
    if (status !== 'NOT_CONFIGURED') {
      if (!externalLocationId) {
        throw new Error('GOOGLE_PLACES_NO_MATCH: Missing externalLocationId (Place ID) for Google Places details request.');
      }
      try {
        const details = await placesAdapter.getPlaceDetails(externalLocationId);
        return {
          rating: details.rating || 0,
          reviewCount: details.userRatingCount || 0,
          businessStatus: details.businessStatus || 'OPERATIONAL',
          adapterUsed: 'GOOGLE_PLACES',
        };
      } catch (err: any) {
        console.error('Google Places details fetch failed:', err);
        throw err;
      }
    } else {
      throw new Error('GOOGLE_PLACES_NOT_CONFIGURED: Google Places API Key is missing in environment.');
    }
  }

  // Yelp and OpenTable use mock/fluctuating data as before
  let rating = 4.5;
  let reviewCount = 500;

  const seed = new Date().getMinutes() % 10;
  const offsetRating = seed > 5 ? 0.1 : seed < 3 ? -0.1 : 0.0;
  const offsetReviews = seed * 5;

  if (provider === 'YELP') {
    rating = Math.min(5.0, 4.2 + offsetRating);
    reviewCount = 850 + offsetReviews;
  } else if (provider === 'OPENTABLE') {
    rating = Math.min(5.0, 4.6 + offsetRating);
    reviewCount = 1200 + offsetReviews;
  } else {
    rating = Math.min(5.0, 4.5 + offsetRating);
    reviewCount = 500 + offsetReviews;
  }

  return { rating, reviewCount };
}

/**
 * Monitors a source profile, checking for deltas and creating immutable snapshots.
 */
export async function monitorSource(sourceId: string): Promise<MonitoringResult> {
  const source = await db.externalSource.findUnique({
    where: { id: sourceId }
  });

  if (!source) throw new Error('External source not found');

  const now = new Date();

  // Create running IngestionRun entry
  const ingestionRun = await db.ingestionRun.create({
    data: {
      organizationId: source.organizationId,
      locationId: source.locationId,
      competitorLocationId: source.competitorLocationId,
      externalSourceId: sourceId,
      provider: source.provider,
      acquisitionMethod: AcquisitionMethod.OFFICIAL_API,
      coverageType: CoverageType.METADATA_ONLY,
      status: 'RUNNING',
      startedAt: now,
      metadata: {
        adapter: source.provider === 'GOOGLE' ? 'GOOGLE_PLACES' : 'MOCK_ADAPTER',
        action: 'MONITOR'
      }
    }
  });

  // Guard by source policy
  const isAllowed = await checkSourcePolicy(source.provider, 'allowAutomatedMonitoring');
  if (!isAllowed) {
    await db.externalSource.update({
      where: { id: sourceId },
      data: { status: 'DISABLED', lastCheckedAt: now }
    });
    await db.ingestionRun.update({
      where: { id: ingestionRun.id },
      data: {
        status: 'BLOCKED',
        completedAt: new Date(),
        errorMessage: 'BLOCKED_BY_SOURCE_POLICY'
      }
    });
    return {
      sourceId,
      provider: source.provider,
      checkedAt: now,
      status: 'BLOCKED_BY_SOURCE_POLICY',
      eventsRaised: ['BLOCKED_BY_SOURCE_POLICY']
    };
  }

  // Guard by adapter operational status (configured & available)
  if (source.provider === 'GOOGLE') {
    const placesAdapter = new GooglePlacesAdapter();
    if (placesAdapter.getAdapterStatus() === 'NOT_CONFIGURED') {
      await db.externalSource.update({
        where: { id: sourceId },
        data: { status: 'UNAVAILABLE', lastCheckedAt: now }
      });
      await db.ingestionRun.update({
        where: { id: ingestionRun.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorCode: 'NOT_CONFIGURED',
          errorMessage: 'GOOGLE_PLACES_NOT_CONFIGURED: Google Places API Key is missing in environment.'
        }
      });
      throw new Error('GOOGLE_PLACES_NOT_CONFIGURED: Google Places API Key is missing in environment.');
    }
  }

  try {
    const meta = await fetchPublicMetadata(source.provider, source.sourceUrl, source.externalLocationId);

    // Persist snapshot if metadata has changed
    const { snapshot, changeEvents } = await createSnapshotIfChanged(sourceId, {
      rating: meta.rating,
      reviewCount: meta.reviewCount,
      businessStatus: meta.businessStatus || null,
      adapter: meta.adapterUsed || null,
      acquisitionMethod: AcquisitionMethod.OFFICIAL_API,
      coverageType: CoverageType.METADATA_ONLY
    });

    if (snapshot) {
      await db.externalSource.update({
        where: { id: sourceId },
        data: { status: 'MONITORING' }
      });
    }

    await db.ingestionRun.update({
      where: { id: ingestionRun.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        rawItemsReceived: 1,
        normalizedItems: 1,
        acceptedItems: 1
      }
    });

    return {
      sourceId,
      provider: source.provider,
      checkedAt: now,
      status: 'MONITORING',
      rating: meta.rating,
      reviewCount: meta.reviewCount,
      eventsRaised: changeEvents
    };
  } catch (err: any) {
    console.error(`Monitoring failed for source ${sourceId}:`, err);
    await db.externalSource.update({
      where: { id: sourceId },
      data: { status: 'UNAVAILABLE', lastCheckedAt: now }
    });
    await db.ingestionRun.update({
      where: { id: ingestionRun.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorCode: 'ERROR',
        errorMessage: err.message || 'Unknown error'
      }
    });
    return {
      sourceId,
      provider: source.provider,
      checkedAt: now,
      status: 'UNAVAILABLE',
      eventsRaised: ['SOURCE_UNAVAILABLE']
    };
  }
}
