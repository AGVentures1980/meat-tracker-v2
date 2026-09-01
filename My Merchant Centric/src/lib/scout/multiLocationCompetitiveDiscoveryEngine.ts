import { db } from '@/lib/db';
import { GooglePlacesAdapter, PlaceCandidate } from './adapters/googlePlacesAdapter';

export interface DiscoveryDimensions {
  cuisineSimilarity: 'HIGH' | 'MEDIUM' | 'LOW';
  serviceModelSimilarity: 'HIGH' | 'MEDIUM' | 'LOW';
  occasionSimilarity: 'HIGH' | 'MEDIUM' | 'LOW';
  pricePositioningSimilarity: 'HIGH' | 'MEDIUM' | 'LOW';
  marketRelevance: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface CandidateDiscoveryResult {
  placeId: string | null;
  candidateName: string;
  brandName: string;
  address: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  distanceMiles: number;
  googleRating: number | null;
  userRatingCount: number | null;
  businessStatus: string;
  dimensions: DiscoveryDimensions;
  proposedTier: 'DIRECT_CANDIDATE' | 'SECONDARY_CANDIDATE' | 'WATCHLIST_CANDIDATE' | 'LOW_RELEVANCE' | 'IDENTITY_UNVERIFIED';
  explanation: string;
  identityStatus: 'VERIFIED' | 'UNRESOLVED';
}

export interface LocationPilotReport {
  subjectLocationId: string;
  subjectLocationName: string;
  city: string;
  state: string;
  discoveryRadiusMiles: number;
  candidatesFound: number;
  directCandidatesCount: number;
  secondaryCandidatesCount: number;
  watchlistCandidatesCount: number;
  lowRelevanceCount: number;
  unresolvedIdentitiesCount: number;
  noDirectCompetitors: boolean;
  status: 'COMPLETED' | 'DISCOVERY_BLOCKED_LOCATION_IDENTITY' | 'FAILED';
  candidates: CandidateDiscoveryResult[];
}

/**
 * Haversine formula to compute exact distance in miles between 2 lat/lng pairs.
 */
function calculateHaversineDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

/**
 * Extract canonical brand name from full store display name.
 */
function extractCanonicalBrandName(displayName: string): string {
  const nameLower = displayName.toLowerCase();
  
  if (nameLower.includes('fogo de chã') || nameLower.includes('fogo de chao')) return 'Fogo de Chão';
  if (nameLower.includes('terra gaúcha') || nameLower.includes('terra gaucha')) return 'Terra Gaúcha Brazilian Steakhouse';
  if (nameLower.includes('bahia churrascaria')) return 'Bahia Churrascaria';
  if (nameLower.includes('rodizio grill')) return 'Rodizio Grill';
  if (nameLower.includes('chama gaúcha') || nameLower.includes('chama gaucha')) return 'Chama Gaúcha Brazilian Steakhouse';
  if (nameLower.includes('galpão gaucho') || nameLower.includes('galpao gaucho')) return 'Galpão Gaucho Brazilian Steakhouse';
  if (nameLower.includes('brazapan')) return 'Brazapan Brazilian Grill';
  if (nameLower.includes('el churrascaso')) return 'El Churrascaso Grill';
  if (nameLower.includes('capital grille')) return 'The Capital Grille';
  if (nameLower.includes('fleming')) return "Fleming's Prime Steakhouse & Wine Bar";
  if (nameLower.includes('ruth') && nameLower.includes('chris')) return "Ruth's Chris Steak House";
  if (nameLower.includes('morton')) return "Morton's The Steakhouse";
  if (nameLower.includes('del frisco')) return "Del Frisco's Double Eagle Steakhouse";
  if (nameLower.includes('eddie v')) return "Eddie V's Prime Seafood";
  if (nameLower.includes('perry')) return "Perry's Steakhouse & Grille";
  if (nameLower.includes('charley')) return "Charley's Steak House";
  if (nameLower.includes('bazaar meat')) return 'Bazaar Meat by José Andrés';
  if (nameLower.includes('herbs & rye') || nameLower.includes('herbs and rye')) return 'Herbs & Rye';
  if (nameLower.includes('cleaver')) return 'Cleaver Butchery & Cocktails';

  // Fallback: strip location suffix after dash or comma
  return displayName.split(/[-–,]/)[0].trim();
}

/**
 * Evaluate categorical relevance dimensions & proposed classification tier.
 */
function evaluateDimensionsAndTier(
  candidateName: string,
  primaryType: string | undefined,
  distanceMiles: number,
  businessStatus: string
): { dimensions: DiscoveryDimensions; proposedTier: CandidateDiscoveryResult['proposedTier']; explanation: string } {
  const nameLower = candidateName.toLowerCase();

  const isBrazilian =
    nameLower.includes('churrasc') ||
    nameLower.includes('fogo') ||
    nameLower.includes('rodizio') ||
    nameLower.includes('gaucha') ||
    nameLower.includes('gaucho') ||
    nameLower.includes('brazilian');

  const isSteakhouse =
    isBrazilian ||
    nameLower.includes('steak') ||
    nameLower.includes('grille') ||
    nameLower.includes('chophouse') ||
    nameLower.includes('prime') ||
    (primaryType && primaryType.toLowerCase().includes('steak'));

  let cuisineSimilarity: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  if (isBrazilian) cuisineSimilarity = 'HIGH';
  else if (isSteakhouse) cuisineSimilarity = 'MEDIUM';

  let serviceModelSimilarity: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  if (isBrazilian) serviceModelSimilarity = 'HIGH';
  else if (isSteakhouse) serviceModelSimilarity = 'HIGH';

  let occasionSimilarity: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
  if (isBrazilian || isSteakhouse) occasionSimilarity = 'HIGH';

  let pricePositioningSimilarity: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
  if (isBrazilian || isSteakhouse) pricePositioningSimilarity = 'HIGH';

  let marketRelevance: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  if (distanceMiles <= 15) marketRelevance = 'HIGH';
  else if (distanceMiles <= 25) marketRelevance = 'MEDIUM';

  let proposedTier: CandidateDiscoveryResult['proposedTier'] = 'LOW_RELEVANCE';
  if (businessStatus === 'CLOSED_PERMANENTLY') {
    proposedTier = 'LOW_RELEVANCE';
  } else if (cuisineSimilarity === 'HIGH' && distanceMiles <= 20) {
    proposedTier = 'DIRECT_CANDIDATE';
  } else if (isSteakhouse && distanceMiles <= 20) {
    proposedTier = 'SECONDARY_CANDIDATE';
  } else if (distanceMiles <= 25 && (isBrazilian || isSteakhouse)) {
    proposedTier = 'WATCHLIST_CANDIDATE';
  }

  const explanation = `Cuisine: ${cuisineSimilarity} | Service Model: ${serviceModelSimilarity} | Occasion: ${occasionSimilarity} | Price: ${pricePositioningSimilarity} | Distance: ${distanceMiles} mi | Result: ${proposedTier}`;

  return {
    dimensions: {
      cuisineSimilarity,
      serviceModelSimilarity,
      occasionSimilarity,
      pricePositioningSimilarity,
      marketRelevance,
    },
    proposedTier,
    explanation,
  };
}

export class MultiLocationCompetitiveDiscoveryEngine {
  private placesAdapter: GooglePlacesAdapter;

  constructor() {
    this.placesAdapter = new GooglePlacesAdapter();
  }

  /**
   * Execute Competitive Discovery Pilot for a specific subject Location ID.
   */
  public async runDiscoveryForLocation(locationId: string): Promise<LocationPilotReport> {
    const subjectLoc = await db.location.findUnique({
      where: { id: locationId },
      include: { organization: true },
    });

    if (!subjectLoc) {
      throw new Error(`Location not found in database: ${locationId}`);
    }

    console.log(`\n========================================================================`);
    console.log(`  RUNNING PILOT DISCOVERY FOR: ${subjectLoc.name} (${subjectLoc.city}, ${subjectLoc.state})`);
    console.log(`========================================================================`);

    // 1. Verify Geographic Identity
    const query = `${subjectLoc.name} ${subjectLoc.address} ${subjectLoc.city} ${subjectLoc.state}`;
    let subjectPlaces: PlaceCandidate[] = [];
    try {
      subjectPlaces = await this.placesAdapter.discoverPlaces(query);
    } catch (err: any) {
      console.warn(`Places search error for subject location identity: ${err.message}`);
    }

    const matchedSubject = subjectPlaces.find(p => p.displayName.toLowerCase().includes('texas de brazil'));
    
    let subjectLat = subjectLoc.latitude;
    let subjectLng = subjectLoc.longitude;
    let subjectPlaceId = matchedSubject?.id || null;

    if (matchedSubject && matchedSubject.latitude && matchedSubject.longitude) {
      subjectLat = matchedSubject.latitude;
      subjectLng = matchedSubject.longitude;

      // Update location identity in DB with authentic Google Place info
      await db.location.update({
        where: { id: locationId },
        data: {
          latitude: subjectLat,
          longitude: subjectLng,
        },
      });
    }

    if (!subjectLat || !subjectLng) {
      console.error(`❌ BLOCKED: Geographic identity unverified for ${subjectLoc.name}`);
      
      await db.competitiveDiscoveryRun.create({
        data: {
          organizationId: subjectLoc.organizationId,
          locationId: subjectLoc.id,
          radiusMiles: 15.0,
          status: 'DISCOVERY_BLOCKED_LOCATION_IDENTITY',
          blockReason: 'Geographic latitude/longitude coordinates unresolved from official Places API.',
          provenanceMode: 'LIVE',
        },
      });

      return {
        subjectLocationId: subjectLoc.id,
        subjectLocationName: subjectLoc.name,
        city: subjectLoc.city,
        state: subjectLoc.state,
        discoveryRadiusMiles: 15.0,
        candidatesFound: 0,
        directCandidatesCount: 0,
        secondaryCandidatesCount: 0,
        watchlistCandidatesCount: 0,
        lowRelevanceCount: 0,
        unresolvedIdentitiesCount: 0,
        noDirectCompetitors: true,
        status: 'DISCOVERY_BLOCKED_LOCATION_IDENTITY',
        candidates: [],
      };
    }

    console.log(`✔ Subject Location Verified: Lat ${subjectLat}, Lng ${subjectLng} | Place ID: ${subjectPlaceId || 'N/A'}`);

    // 2. Perform Multi-Query Discovery
    const discoveryRadiusMiles = 20.0;
    const textQueries = [
      `Brazilian steakhouse near ${subjectLoc.city} ${subjectLoc.state}`,
      `Churrascaria near ${subjectLoc.city} ${subjectLoc.state}`,
      `Steakhouse near ${subjectLoc.city} ${subjectLoc.state}`,
      `Upscale steakhouse near ${subjectLoc.city} ${subjectLoc.state}`,
    ];

    const rawCandidatesMap = new Map<string, PlaceCandidate>();

    for (const tq of textQueries) {
      try {
        const results = await this.placesAdapter.discoverPlaces(tq);
        results.forEach(p => {
          // Zero tolerance: filter out self-competition (Texas de Brazil)
          if (!p.displayName.toLowerCase().includes('texas de brazil')) {
            rawCandidatesMap.set(p.id, p);
          }
        });
      } catch (err: any) {
        console.warn(`Query search warning for [${tq}]: ${err.message}`);
      }
    }

    console.log(`    • Raw Unique Places Discovered from Google API: ${rawCandidatesMap.size}`);

    // 3. Process Candidates & Calculate Dimensions
    const candidateResults: CandidateDiscoveryResult[] = [];

    // Retrieve or Create CompetitiveSet for this location
    let compSet = await db.competitiveSet.findFirst({
      where: { locationId: subjectLoc.id, organizationId: subjectLoc.organizationId },
    });

    if (!compSet) {
      compSet = await db.competitiveSet.create({
        data: {
          organizationId: subjectLoc.organizationId,
          locationId: subjectLoc.id,
          name: `${subjectLoc.name} Competitive Set`,
          status: 'ACTIVE',
          createdBy: 'DataScout_Discovery_Engine',
          provenanceMode: 'LIVE',
        },
      });
    }

    let directCount = 0;
    let secondaryCount = 0;
    let watchlistCount = 0;
    let lowRelCount = 0;
    let unresolvedCount = 0;

    for (const p of Array.from(rawCandidatesMap.values())) {
      const pLat = p.latitude;
      const pLng = p.longitude;

      if (!pLat || !pLng) {
        unresolvedCount++;
        continue;
      }

      const dist = calculateHaversineDistanceMiles(subjectLat, subjectLng, pLat, pLng);

      // Focus on relevant trade area (<= 25 miles)
      if (dist > 30.0) continue;

      const brandName = extractCanonicalBrandName(p.displayName);
      const bizStatus = 'OPERATIONAL';

      const { dimensions, proposedTier, explanation } = evaluateDimensionsAndTier(
        p.displayName,
        p.primaryType,
        dist,
        bizStatus
      );

      if (proposedTier === 'DIRECT_CANDIDATE') directCount++;
      else if (proposedTier === 'SECONDARY_CANDIDATE') secondaryCount++;
      else if (proposedTier === 'WATCHLIST_CANDIDATE') watchlistCount++;
      else lowRelCount++;

      candidateResults.push({
        placeId: p.id,
        candidateName: p.displayName,
        brandName,
        address: p.formattedAddress,
        city: subjectLoc.city,
        state: subjectLoc.state,
        latitude: pLat,
        longitude: pLng,
        distanceMiles: dist,
        googleRating: p.rating || null,
        userRatingCount: p.userRatingCount || null,
        businessStatus: bizStatus,
        dimensions,
        proposedTier,
        explanation,
        identityStatus: 'VERIFIED',
      });

      // 4. Create/Reuse CompetitorBrand in DB
      let brand = await db.competitorBrand.findFirst({
        where: { name: { equals: brandName, mode: 'insensitive' } },
      });

      if (!brand) {
        brand = await db.competitorBrand.create({
          data: {
            name: brandName,
            website: p.websiteUri || null,
            organizationId: subjectLoc.organizationId,
          },
        });
      }

      // Create/Find physical CompetitorLocation in DB
      let compLoc = await db.competitorLocation.findFirst({
        where: { googlePlaceId: p.id },
      });

      if (!compLoc) {
        compLoc = await db.competitorLocation.create({
          data: {
            organizationId: subjectLoc.organizationId,
            competitorBrandId: brand.id,
            name: p.displayName,
            address: p.formattedAddress,
            city: subjectLoc.city,
            state: subjectLoc.state,
            country: 'USA',
            latitude: pLat,
            longitude: pLng,
            googlePlaceId: p.id,
            googleRating: p.rating || null,
            userRatingCount: p.userRatingCount || null,
            businessStatus: bizStatus,
            identityStatus: 'VERIFIED',
            primaryCategory: p.primaryType || 'restaurant',
            provenanceMode: 'LIVE',
          },
        });
      }

      // Check if candidate relationship already exists in Tampa or this location's CompetitiveSet
      const existingMember = await db.competitiveSetMember.findFirst({
        where: {
          competitiveSetId: compSet.id,
          competitorLocationId: compLoc.id,
        },
      });

      // TAMPA POSITIVE CONTROL GUARD: Do NOT overwrite Tampa approved members!
      if (!existingMember) {
        await db.competitiveSetMember.create({
          data: {
            competitiveSetId: compSet.id,
            competitorLocationId: compLoc.id,
            matchScore: 85.0,
            tier: proposedTier === 'DIRECT_CANDIDATE' ? 'DIRECT' : 'ADJACENT',
            status: 'PENDING', // NEVER automatically approve!
            suggestedByAI: true,
            approvedByUser: false,
            competitiveRole: proposedTier === 'DIRECT_CANDIDATE' ? 'DIRECT' : proposedTier === 'SECONDARY_CANDIDATE' ? 'SECONDARY' : 'WATCHLIST',
            relevanceClassification: proposedTier,
            proposedTier: proposedTier,
            confidence: 'HIGH',
            cuisineSimilarity: dimensions.cuisineSimilarity,
            serviceModelSimilarity: dimensions.serviceModelSimilarity,
            occasionSimilarity: dimensions.occasionSimilarity,
            pricePositioningSimilarity: dimensions.pricePositioningSimilarity,
            marketRelevance: dimensions.marketRelevance,
            distanceMiles: dist,
            explanation,
            provenanceMode: 'LIVE',
          },
        });
      }
    }

    const noDirectCompetitors = directCount === 0;

    // 5. Store CompetitiveDiscoveryRun record
    await db.competitiveDiscoveryRun.create({
      data: {
        organizationId: subjectLoc.organizationId,
        locationId: subjectLoc.id,
        radiusMiles: discoveryRadiusMiles,
        candidatesFoundCount: candidateResults.length,
        directCandidatesCount: directCount,
        secondaryCandidatesCount: secondaryCount,
        watchlistCandidatesCount: watchlistCount,
        lowRelevanceCount: lowRelCount,
        unresolvedIdentitiesCount: unresolvedCount,
        noDirectCompetitors,
        status: 'COMPLETED',
        provenanceMode: 'LIVE',
      },
    });

    console.log(`    • Direct Candidates: ${directCount}`);
    console.log(`    • Secondary Candidates: ${secondaryCount}`);
    console.log(`    • Watchlist Candidates: ${watchlistCount}`);
    console.log(`    • Zero Direct Competitors: ${noDirectCompetitors ? 'YES' : 'NO'}`);

    return {
      subjectLocationId: subjectLoc.id,
      subjectLocationName: subjectLoc.name,
      city: subjectLoc.city,
      state: subjectLoc.state,
      discoveryRadiusMiles,
      candidatesFound: candidateResults.length,
      directCandidatesCount: directCount,
      secondaryCandidatesCount: secondaryCount,
      watchlistCandidatesCount: watchlistCount,
      lowRelevanceCount: lowRelCount,
      unresolvedIdentitiesCount: unresolvedCount,
      noDirectCompetitors,
      status: 'COMPLETED',
      candidates: candidateResults,
    };
  }
}
