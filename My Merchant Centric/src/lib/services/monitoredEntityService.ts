import { db } from '@/lib/db';

export type EntityType = 'OWNED_LOCATION' | 'MONITORED_EXTERNAL' | 'COMPETITOR' | 'COMPETITOR_CANDIDATE';

export interface MonitoredEntity {
  id: string;
  brandName: string;
  locationName: string;
  city: string;
  state: string;
  address: string;
  entityType: EntityType;
  monitoringStatus: string;
  googleRating: number | null;
  reviewCount: number | null;
  coverageType: string;
  lastCheckedAt: string | null;
  nextCheckAt: string | null;
  externalSourceId: string | null;
  placeId: string | null;
  dataSources: Array<{
    id: string;
    provider: string;
    adapterUsed: string | null;
    status: string;
    confidence: string;
    lastCheckedAt: string | null;
  }>;
}

export interface MonitoredEntityFilters {
  search?: string;
  entityType?: string;
  monitoringStatus?: string;
  cityState?: string;
}

/**
 * Ensures no ExternalSource record is left without a parent Location or CompetitorLocation.
 */
export async function ensureNoOrphanSources(organizationId: string) {
  const orphanSources = await db.externalSource.findMany({
    where: {
      organizationId,
      locationId: null,
      competitorLocationId: null,
    }
  });

  if (orphanSources.length === 0) return;

  // Find or create default competitor brand
  let compBrand = await db.competitorBrand.findFirst();
  if (!compBrand) {
    compBrand = await db.competitorBrand.create({
      data: {
        name: 'Monitored External Brand',
      }
    });
  }

  for (const source of orphanSources) {
    // Attempt to match existing CompetitorLocation by displayName
    let compLoc = await db.competitorLocation.findFirst({
      where: {
        organizationId,
        name: source.displayName || 'Monitored External Unit'
      }
    });

    if (!compLoc) {
      compLoc = await db.competitorLocation.create({
        data: {
          organizationId,
          competitorBrandId: compBrand.id,
          name: source.displayName || 'Monitored External Unit',
          address: 'Monitored Location Address',
          city: 'Tampa',
          state: 'FL',
          country: 'US',
        }
      });
    }

    await db.externalSource.update({
      where: { id: source.id },
      data: { competitorLocationId: compLoc.id }
    });
  }
}

/**
 * Retrieves all monitored entities for an organization.
 */
export async function getMonitoredEntities(
  organizationId: string,
  filters: MonitoredEntityFilters = {}
): Promise<MonitoredEntity[]> {
  // First ensure no orphan ExternalSource records exist
  await ensureNoOrphanSources(organizationId);

  const entities: MonitoredEntity[] = [];

  // 1. Fetch Owned Locations (LIVE + IMPORTED only)
  const ownedLocations = await db.location.findMany({
    where: {
      organizationId,
      provenanceMode: { in: ['LIVE', 'IMPORTED'] }
    },
    include: {
      brand: true,
      externalSources: {
        include: {
          snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 }
        }
      }
    }
  });

  for (const loc of ownedLocations) {
    const primarySource = loc.externalSources.find(s => s.provider === 'GOOGLE') || loc.externalSources[0];
    const latestSnapshot = primarySource?.snapshots[0];

    entities.push({
      id: loc.id,
      brandName: loc.brand?.name || 'BRASA Brand',
      locationName: loc.name,
      city: loc.city || 'Tampa',
      state: loc.state || 'FL',
      address: loc.address || '',
      entityType: 'OWNED_LOCATION',
      monitoringStatus: primarySource?.monitoringStatus || 'ACTIVE',
      googleRating: latestSnapshot?.rating ?? null,
      reviewCount: latestSnapshot?.reviewCount ?? null,
      coverageType: latestSnapshot?.coverageType || 'METADATA_ONLY',
      lastCheckedAt: primarySource?.lastCheckedAt ? new Date(primarySource.lastCheckedAt).toISOString() : null,
      nextCheckAt: primarySource?.nextCheckAt ? new Date(primarySource.nextCheckAt).toISOString() : null,
      externalSourceId: primarySource?.id || null,
      placeId: primarySource?.externalLocationId || null,
      dataSources: loc.externalSources.map(s => ({
        id: s.id,
        provider: s.provider,
        adapterUsed: s.adapterUsed,
        status: s.status,
        confidence: s.confidence,
        lastCheckedAt: s.lastCheckedAt ? new Date(s.lastCheckedAt).toISOString() : null
      }))
    });
  }

  // 2. Fetch Competitor Locations & External Monitored Locations (LIVE + IMPORTED only)
  const compLocations = await db.competitorLocation.findMany({
    where: {
      organizationId,
      provenanceMode: { in: ['LIVE', 'IMPORTED'] }
    },
    include: {
      externalSources: {
        include: {
          snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 }
        }
      }
    }
  });

  for (const comp of compLocations) {
    const primarySource = comp.externalSources.find(s => s.provider === 'GOOGLE') || comp.externalSources[0];
    const latestSnapshot = primarySource?.snapshots[0];

    let entityType: EntityType = 'COMPETITOR';
    // Classify Texas de Brazil and external monitored targets
    const lowerName = comp.name.toLowerCase();
    if (lowerName.includes('texas de brazil') || lowerName.includes('monitored external')) {
      entityType = 'MONITORED_EXTERNAL';
    } else if (primarySource?.status === 'DISCOVERED' || primarySource?.status === 'PENDING_CONFIRMATION') {
      entityType = 'COMPETITOR_CANDIDATE';
    }

    // Determine brand name & location name cleanly
    let brandName = 'Competitor Brand';
    let locationName = comp.name;

    if (lowerName.includes('texas de brazil')) {
      brandName = 'Texas de Brazil';
      locationName = comp.name.replace(/texas de brazil\s*[-–]?\s*/i, '').trim() || 'Tampa';
    } else if (lowerName.includes('fogo de chão') || lowerName.includes('fogo de chao')) {
      brandName = 'Fogo de Chão';
      locationName = comp.name.replace(/fogo de chã?o\s*[-–]?\s*/i, '').trim() || 'Tampa';
    } else if (lowerName.includes('terra gaucha') || lowerName.includes('terra gaúcha')) {
      brandName = 'Terra Gaúcha';
      locationName = comp.name.replace(/terra gaú?cha\s*(brazilian steakhouse)?\s*[-–]?\s*/i, '').trim() || 'Tampa';
    }

    entities.push({
      id: comp.id,
      brandName,
      locationName: locationName || comp.name,
      city: comp.city || 'Tampa',
      state: comp.state || 'FL',
      address: comp.address || '',
      entityType,
      monitoringStatus: primarySource?.monitoringStatus || 'ACTIVE',
      googleRating: latestSnapshot?.rating ?? null,
      reviewCount: latestSnapshot?.reviewCount ?? null,
      coverageType: latestSnapshot?.coverageType || 'METADATA_ONLY',
      lastCheckedAt: primarySource?.lastCheckedAt ? new Date(primarySource.lastCheckedAt).toISOString() : null,
      nextCheckAt: primarySource?.nextCheckAt ? new Date(primarySource.nextCheckAt).toISOString() : null,
      externalSourceId: primarySource?.id || null,
      placeId: primarySource?.externalLocationId || null,
      dataSources: comp.externalSources.map(s => ({
        id: s.id,
        provider: s.provider,
        adapterUsed: s.adapterUsed,
        status: s.status,
        confidence: s.confidence,
        lastCheckedAt: s.lastCheckedAt ? new Date(s.lastCheckedAt).toISOString() : null
      }))
    });
  }

  // 3. Apply Filters
  let filtered = entities;

  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(e =>
      e.brandName.toLowerCase().includes(q) ||
      e.locationName.toLowerCase().includes(q) ||
      e.city.toLowerCase().includes(q) ||
      e.address.toLowerCase().includes(q)
    );
  }

  if (filters.entityType && filters.entityType !== 'ALL') {
    filtered = filtered.filter(e => e.entityType === filters.entityType);
  }

  if (filters.monitoringStatus && filters.monitoringStatus !== 'ALL') {
    filtered = filtered.filter(e => e.monitoringStatus === filters.monitoringStatus);
  }

  if (filters.cityState && filters.cityState !== 'ALL') {
    const cs = filters.cityState.toLowerCase();
    filtered = filtered.filter(e => `${e.city}, ${e.state}`.toLowerCase().includes(cs));
  }

  return filtered;
}

/**
 * Retrieves detailed entity view for a specific monitored entity ID.
 */
export async function getMonitoredEntityDetail(organizationId: string, entityId: string) {
  const allEntities = await getMonitoredEntities(organizationId);
  const entity = allEntities.find(e => e.id === entityId);

  if (!entity) {
    return null;
  }

  // Fetch full snapshots history if external source exists
  let snapshots: any[] = [];
  let events: any[] = [];

  if (entity.externalSourceId) {
    snapshots = await db.sourceSnapshot.findMany({
      where: { externalSourceId: entity.externalSourceId },
      orderBy: { capturedAt: 'desc' },
      take: 50
    });

    events = await db.reputationEvent.findMany({
      where: { externalSourceId: entity.externalSourceId },
      orderBy: { detectedAt: 'desc' },
      take: 20
    });
  }

  return {
    entity,
    snapshots,
    events
  };
}
