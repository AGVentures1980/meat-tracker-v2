import { db } from '@/lib/db';
import { createExternalSource } from '../services/scoutService';
import { GooglePlacesAdapter } from '../scout/adapters/googlePlacesAdapter';

export interface DiscoveryInput {
  organizationId: string;
  locationId?: string | null;
  competitorLocationId?: string | null;
  restaurantName: string;
  address: string;
  city: string;
  state: string;
  website?: string | null;
}

export interface CandidateSource {
  provider: string;
  sourceUrl: string;
  displayName: string;
  externalLocationId: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  rating: number;
  reviewCount: number;
  discoveryMethod?: string;
  adapterUsed?: string;
}

/**
 * Searches candidates deterministically based on restaurant metadata or calls live Places API.
 */
export async function runProfileDiscovery(input: DiscoveryInput): Promise<CandidateSource[]> {
  const { restaurantName, address, city, state, website } = input;

  // Exclude self-brand check
  if (input.locationId && input.competitorLocationId) {
    throw new Error('A candidate search target must be either an owned location or a competitor location.');
  }

  const cleanName = restaurantName.toLowerCase().replace(/[^a-z0-9]/g, '');

  const providers = ['GOOGLE', 'YELP', 'OPENTABLE'];
  const candidates: CandidateSource[] = [];

  const googlePlacesAdapter = new GooglePlacesAdapter();

  for (const provider of providers) {
    if (provider === 'GOOGLE') {
      const adapterStatus = googlePlacesAdapter.getAdapterStatus();
      if (adapterStatus !== 'NOT_CONFIGURED') {
        try {
          const query = `${restaurantName} ${address || ''} ${city} ${state}`;
          const results = await googlePlacesAdapter.discoverPlaces(query);
          if (results.length > 0) {
            for (const p of results) {
              let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
              const nameMatch = p.displayName.toLowerCase().includes(restaurantName.toLowerCase()) ||
                                restaurantName.toLowerCase().includes(p.displayName.toLowerCase());
              const cityMatch = p.formattedAddress.toLowerCase().includes(city.toLowerCase());
              if (nameMatch && cityMatch) {
                confidence = 'HIGH';
              } else if (nameMatch || cityMatch) {
                confidence = 'MEDIUM';
              } else {
                confidence = 'LOW';
              }

              candidates.push({
                provider: 'GOOGLE',
                sourceUrl: p.googleMapsUri || `https://maps.google.com/?q=place_id:${p.id}`,
                displayName: p.displayName,
                externalLocationId: p.id,
                confidence,
                rating: p.rating || 0,
                reviewCount: p.userRatingCount || 0,
                discoveryMethod: 'OFFICIAL_API',
                adapterUsed: 'GOOGLE_PLACES',
              });
            }
            continue;
          }
        } catch (err: any) {
          console.error('Google Places discovery failed:', err);
          // Do not silently fallback to mock data for Google if configured but errored
          throw err;
        }
      } else {
        // If not configured, we do not return any candidate for Google.
        // It remains empty for Google.
        console.log('Google Places is not configured. Omit Google candidate generation.');
      }
    } else {
      // Yelp and OpenTable use mock/deterministic candidates for MVP
      let displayName = `${restaurantName} on ${provider.charAt(0) + provider.slice(1).toLowerCase()}`;
      let extId = '';
      let sourceUrl = '';
      let rating = 4.5;
      let reviewCount = 150;
      let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';

      if (provider === 'YELP') {
        extId = `yelp-biz-${cleanName}-${city.toLowerCase()}`;
        sourceUrl = `https://www.yelp.com/biz/${extId}`;
        rating = 4.2;
        reviewCount = 850;
        confidence = 'HIGH';
      } else if (provider === 'OPENTABLE') {
        extId = `opentable-rest-${cleanName}-${city.toLowerCase()}`;
        sourceUrl = `https://www.opentable.com/restaurant/${extId}`;
        rating = 4.6;
        reviewCount = 1200;
        confidence = 'MEDIUM';
      }

      candidates.push({
        provider,
        sourceUrl,
        displayName,
        externalLocationId: extId,
        confidence,
        rating,
        reviewCount,
        discoveryMethod: 'DETERMINISTIC_MATCH',
      });
    }
  }

  return candidates;
}

/**
 * Saves candidate sources to the database.
 */
export async function discoverAndPersistSources(input: DiscoveryInput) {
  const candidates = await runProfileDiscovery(input);
  const createdSources = [];

  for (const c of candidates) {
    const isCompetitor = !!input.competitorLocationId;

    const source = await createExternalSource({
      organizationId: input.organizationId,
      locationId: input.locationId,
      competitorLocationId: input.competitorLocationId,
      provider: c.provider,
      externalLocationId: c.externalLocationId,
      sourceUrl: c.sourceUrl,
      displayName: c.displayName,
      status: 'PENDING_CONFIRMATION',
      confidence: c.confidence,
      isCompetitor,
      discoveryMethod: c.discoveryMethod || 'DETERMINISTIC_MATCH',
      adapterUsed: c.adapterUsed || null,
    });

    createdSources.push(source);
  }

  return createdSources;
}
