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
  verificationStatus?: string;
  businessStatus?: string;
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

  // 1. Fetch Owned Locations
  const ownedLocations = await db.location.findMany({
    where: {
      organizationId,
      status: 'ACTIVE'
    },
    include: {
      brand: true,
      organization: true,
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
      brandName: loc.brand?.name || loc.organization?.name || 'Owned Brand',
      locationName: loc.name,
      city: loc.city || 'Tampa',
      state: loc.state || 'FL',
      address: loc.address || '',
      entityType: 'OWNED_LOCATION',
      monitoringStatus: primarySource?.monitoringStatus || 'ACTIVE',
      verificationStatus: loc.verificationStatus || undefined,
      businessStatus: loc.businessStatus || undefined,
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

  // 2. Fetch Competitor Locations & External Monitored Locations
  const compLocations = await db.competitorLocation.findMany({
    where: {
      organizationId,
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

  for (const comp of compLocations) {
    const primarySource = comp.externalSources.find(s => s.provider === 'GOOGLE') || comp.externalSources[0];
    const latestSnapshot = primarySource?.snapshots[0];

    let entityType: EntityType = 'COMPETITOR';
    const lowerName = comp.name.toLowerCase();
    if (lowerName.includes('monitored external')) {
      entityType = 'MONITORED_EXTERNAL';
    } else if (primarySource?.status === 'DISCOVERED' || primarySource?.status === 'PENDING_CONFIRMATION') {
      entityType = 'COMPETITOR_CANDIDATE';
    }

    // Determine brand name & location name cleanly
    let brandName = comp.brand?.name || 'Competitor Brand';
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

  // Filter based on requested parameters
  let filtered = entities;
  if (filters.entityType && filters.entityType !== 'ALL') {
    filtered = filtered.filter(e => e.entityType === filters.entityType);
  }
  if (filters.monitoringStatus && filters.monitoringStatus !== 'ALL') {
    filtered = filtered.filter(e => e.monitoringStatus === filters.monitoringStatus);
  }
  if (filters.search) {
    const s = filters.search.toLowerCase();
    filtered = filtered.filter(e =>
      e.brandName.toLowerCase().includes(s) ||
      e.locationName.toLowerCase().includes(s) ||
      e.city.toLowerCase().includes(s) ||
      e.state.toLowerCase().includes(s)
    );
  }

  return filtered;
}

/**
 * Retrieves detail for a single monitored entity.
 */
export async function getMonitoredEntityDetail(organizationId: string, entityId: string) {
  const entities = await getMonitoredEntities(organizationId);
  const entity = entities.find(e => e.id === entityId);
  if (!entity) return null;
  return { entity, snapshots: entity.dataSources || [] };
}
