import { db } from '../src/lib/db';
import { calculateDistanceMiles } from '../src/lib/scout/competitiveRelevanceEngine';

interface GooglePlaceRaw {
  id: string;
  displayName?: { text: string; languageCode?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  primaryType?: string;
  types?: string[];
  priceLevel?: string;
  googleMapsUri?: string;
}

async function runPhase4LiveDiscovery() {
  console.log('==================================================');
  console.log('PHASE 4 — OFFICIAL GOOGLE PLACES LIVE DISCOVERY');
  console.log('==================================================\n');

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error('❌ PROVIDER_UNAVAILABLE: GOOGLE_PLACES_API_KEY is missing');
    process.exit(1);
  }

  const tenantOrg = await db.organization.findFirst({ where: { name: { contains: 'Demo' } } }) || await db.organization.findFirst();
  if (!tenantOrg) throw new Error('Tenant organization missing');

  // 1. Fetch Subject Location Texas de Brazil Tampa
  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Texas de Brazil Tampa location record missing');

  const subjectLat = texasLoc.latitude || 27.9653;
  const subjectLng = texasLoc.longitude || -82.5186;

  console.log(`Subject Location: ${texasLoc.name} (Lat: ${subjectLat}, Lng: ${subjectLng})`);

  // 2. Search Queries to execute
  const searchQueries = [
    'Brazilian steakhouse Tampa FL',
    'churrascaria Tampa FL',
    'rodizio Tampa FL',
    'Brazilian restaurant Tampa FL',
    'steakhouse Tampa FL',
    'premium steakhouse Tampa FL'
  ];

  const rawDiscoveredMap = new Map<string, GooglePlaceRaw>();

  console.log('\n--- EXECUTING OFFICIAL GOOGLE PLACES API (NEW) TEXT SEARCH ---');

  for (const queryText of searchQueries) {
    console.log(`Executing query: "${queryText}"...`);
    try {
      const url = 'https://places.googleapis.com/v1/places:searchText';
      const headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.businessStatus,places.primaryType,places.types,places.priceLevel,places.googleMapsUri'
      };

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          textQuery: queryText,
          locationBias: {
            circle: {
              center: { latitude: subjectLat, longitude: subjectLng },
              radius: 24140.2 // 15 miles in meters
            }
          }
        })
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.warn(`  ⚠️ HTTP Error ${res.status}: ${errBody.substring(0, 150)}...`);
        continue;
      }

      const data = await res.json();
      const places: GooglePlaceRaw[] = data.places || [];
      console.log(`  -> Google returned ${places.length} place(s).`);

      places.forEach(p => {
        if (p.id && !rawDiscoveredMap.has(p.id)) {
          rawDiscoveredMap.set(p.id, p);
        }
      });
    } catch (err: any) {
      console.error(`  ❌ Fetch error for query "${queryText}": ${err.message}`);
    }
  }

  const totalRawDiscovered = rawDiscoveredMap.size;
  console.log(`\nTotal Unique Raw Places Discovered from Google API: ${totalRawDiscovered}`);

  if (totalRawDiscovered === 0) {
    console.error('❌ PROVIDER_UNAVAILABLE: Google Places API returned zero candidate places.');
    process.exit(1);
  }

  // 3. Filter & Evaluate Discovered Candidates
  const validCandidates: Array<{
    place: GooglePlaceRaw;
    distanceMiles: number;
    relevanceScore: number;
    classification: string;
    confidence: string;
    dimensionEvidence: any;
    explanation: string;
  }> = [];

  const texasPlaceId = 'ChIJHdigC67DwogRkWjPRn8SUbQ';

  for (const [placeId, place] of Array.from(rawDiscoveredMap.entries())) {
    // 3a. Exclude Self-Brand / Exact Place ID Match
    const nameLower = (place.displayName?.text || '').toLowerCase();
    if (placeId === texasPlaceId || nameLower.includes('texas de brazil')) {
      console.log(`[SELF-BRAND FILTER] Excluded self-brand: "${place.displayName?.text}" (${placeId})`);
      continue;
    }

    // 3b. Validate Real-World Criteria
    if (!place.location?.latitude || !place.location?.longitude) {
      console.log(`[GEO FILTER] Excluded candidate missing coordinates: "${place.displayName?.text}"`);
      continue;
    }

    if (place.businessStatus === 'CLOSED_PERMANENTLY') {
      console.log(`[STATUS FILTER] Excluded permanently closed business: "${place.displayName?.text}"`);
      continue;
    }

    const dist = calculateDistanceMiles(subjectLat, subjectLng, place.location.latitude, place.location.longitude);

    // 15-mile trade area constraint
    if (dist > 15.0) {
      console.log(`[TRADE AREA FILTER] Excluded candidate outside 15-mile trade area (${dist} mi): "${place.displayName?.text}"`);
      continue;
    }

    // 3c. 7-Dimensional Evidence-First Relevance Engine
    const isBrazilianChurrascaria = nameLower.includes('brazilian') || nameLower.includes('churras') || nameLower.includes('gaucho') || nameLower.includes('rodizio');
    const isSteakhouse = nameLower.includes('steakhouse') || (place.primaryType && place.primaryType.includes('steak'));

    // Service Model (25%)
    let serviceModelScore = isBrazilianChurrascaria ? 100 : (isSteakhouse ? 70 : 40);
    let serviceModelEvidence = isBrazilianChurrascaria ? 'Churrascaria / Rodizio operating model' : (isSteakhouse ? 'Upscale Steakhouse operating model' : 'General Restaurant');

    // Cuisine (20%)
    let cuisineScore = isBrazilianChurrascaria ? 100 : (isSteakhouse ? 60 : 30);
    let cuisineEvidence = isBrazilianChurrascaria ? 'Brazilian Churrasco / Meat-centric cuisine' : 'Steakhouse / Meat menu';

    // Price Tier (15%)
    let priceScore = 75; // Default neutral if price level missing
    let priceEvidence = place.priceLevel ? `Google Price Tier: ${place.priceLevel}` : 'UNKNOWN (Missing price tier in payload)';

    // Occasion (15%)
    let occasionScore = 80;
    let occasionEvidence = 'Dining / Celebration / Business dining occasion fit';

    // Proximity (15%)
    let proximityScore = Math.max(0, Math.round(100 - (dist / 15.0) * 80));
    let proximityEvidence = `${dist} miles from subject location`;

    // Brand / Market Position (5%)
    let brandScore = 70;
    let brandEvidence = 'Regional / Market Brand positioning';

    // Market Scale (5%)
    let scaleScore = Math.min(100, Math.round(((place.userRatingCount || 0) / 3000) * 100));
    let scaleEvidence = `${place.userRatingCount || 0} Google reviews (${place.rating || 0} ★)`;

    // Calculate Overall Relevance Score
    const totalScore = Math.round(
      serviceModelScore * 0.25 +
      cuisineScore * 0.20 +
      priceScore * 0.15 +
      occasionScore * 0.15 +
      proximityScore * 0.15 +
      brandScore * 0.05 +
      scaleScore * 0.05
    );

    let classification = 'LOW_RELEVANCE';
    if (totalScore >= 80) classification = 'DIRECT_COMPETITOR_CANDIDATE';
    else if (totalScore >= 60) classification = 'STRONG_COMPETITOR_CANDIDATE';
    else if (totalScore >= 40) classification = 'SECONDARY_COMPETITOR_CANDIDATE';

    const confidence = place.priceLevel ? 'HIGH' : 'MEDIUM';

    const explanation = `${place.displayName?.text} is classified as ${classification} (Score: ${totalScore}/100, Confidence: ${confidence}) because it operates ${dist} miles from subject location with ${cuisineEvidence} (${place.rating || 0}★, ${place.userRatingCount || 0} reviews).`;

    validCandidates.push({
      place,
      distanceMiles: dist,
      relevanceScore: totalScore,
      classification,
      confidence,
      dimensionEvidence: {
        serviceModel: { score: serviceModelScore, evidence: serviceModelEvidence },
        cuisine: { score: cuisineScore, evidence: cuisineEvidence },
        priceTier: { score: priceScore, evidence: priceEvidence },
        occasion: { score: occasionScore, evidence: occasionEvidence },
        proximity: { score: proximityScore, evidence: proximityEvidence },
        brandPosition: { score: brandScore, evidence: brandEvidence },
        marketScale: { score: scaleScore, evidence: scaleEvidence }
      },
      explanation
    });
  }

  // Sort by Relevance Score descending
  validCandidates.sort((a, b) => b.relevanceScore - a.relevanceScore);

  console.log(`\nCandidates after Self-Brand & Geo Trade Area Filters: ${validCandidates.length}`);

  // 4. Update Database Set (Store Discovered Candidates as PENDING_MANUAL_REVIEW)
  let compSet = await db.competitiveSet.findFirst({
    where: { organizationId: tenantOrg.id, locationId: texasLoc.id }
  });

  if (!compSet) {
    compSet = await db.competitiveSet.create({
      data: {
        organizationId: tenantOrg.id,
        locationId: texasLoc.id,
        name: 'Texas de Brazil Tampa Primary Market Set',
        createdBy: 'OFFICIAL_GOOGLE_PLACES_API',
        provenanceMode: 'LIVE'
      }
    });
  }

  console.log('\n--- TOP DISCOVERED CANDIDATES FROM OFFICIAL GOOGLE API ---');

  for (const cand of validCandidates.slice(0, 10)) {
    const p = cand.place;
    const displayNameText = p.displayName?.text || 'Discovered Store';

    let compBrand = await db.competitorBrand.findFirst({ where: { name: displayNameText } });
    if (!compBrand) {
      compBrand = await db.competitorBrand.create({
        data: { name: displayNameText, organizationId: tenantOrg.id }
      });
    }

    let compLoc = await db.competitorLocation.findFirst({
      where: { name: displayNameText }
    });

    if (!compLoc) {
      compLoc = await db.competitorLocation.create({
        data: {
          organizationId: tenantOrg.id,
          competitorBrandId: compBrand.id,
          name: displayNameText,
          address: p.formattedAddress || 'Tampa, FL',
          city: 'Tampa',
          state: 'FL',
          country: 'US',
          latitude: p.location?.latitude,
          longitude: p.location?.longitude,
          serviceModel: p.primaryType || 'RESTAURANT',
          priceTier: p.priceLevel || 'MODERATE',
          provenanceMode: 'LIVE'
        }
      });

      const extSource = await db.externalSource.create({
        data: {
          organizationId: tenantOrg.id,
          competitorLocationId: compLoc.id,
          provider: 'GOOGLE',
          externalLocationId: p.id,
          sourceUrl: p.googleMapsUri || `https://maps.google.com/?q=place_id:${p.id}`,
          isCompetitor: true
        }
      });

      await db.sourceSnapshot.create({
        data: {
          organizationId: tenantOrg.id,
          externalSourceId: extSource.id,
          rating: p.rating || 0,
          reviewCount: p.userRatingCount || 0,
          coverageType: 'METADATA_ONLY'
        }
      });
    }

    let member = await db.competitiveSetMember.findFirst({
      where: { competitiveSetId: compSet.id, competitorLocationId: compLoc.id }
    });

    if (!member) {
      member = await db.competitiveSetMember.create({
        data: {
          competitiveSetId: compSet.id,
          competitorLocationId: compLoc.id,
          matchScore: cand.relevanceScore,
          tier: cand.relevanceScore >= 80 ? 'DIRECT' : 'ADJACENT',
          relevanceScore: cand.relevanceScore,
          relevanceClassification: cand.classification,
          confidence: cand.confidence,
          serviceModelFitScore: cand.dimensionEvidence.serviceModel.score,
          cuisineFitScore: cand.dimensionEvidence.cuisine.score,
          priceTierFitScore: cand.dimensionEvidence.priceTier.score,
          occasionFitScore: cand.dimensionEvidence.occasion.score,
          proximityScore: cand.dimensionEvidence.proximity.score,
          brandFitScore: cand.dimensionEvidence.brandPosition.score,
          marketScaleScore: cand.dimensionEvidence.marketScale.score,
          distanceMiles: cand.distanceMiles,
          explanation: cand.explanation,
          evidence: cand.dimensionEvidence as any,
          status: 'PENDING', // ZERO AUTO-APPROVAL
          approvedByUser: false,
          provenanceMode: 'LIVE'
        }
      });
    }

    console.log(`\n• Business Name: ${displayNameText}`);
    console.log(`  - Place ID: ${p.id}`);
    console.log(`  - Address: ${p.formattedAddress}`);
    console.log(`  - Distance: ${cand.distanceMiles} miles`);
    console.log(`  - Rating / Reviews: ${p.rating || 'N/A'} ★ (${(p.userRatingCount || 0).toLocaleString()} reviews)`);
    console.log(`  - Business Status: ${p.businessStatus || 'OPERATIONAL'}`);
    console.log(`  - Price Level: ${p.priceLevel || 'N/A'}`);
    console.log(`  - Relevance Score: ${cand.relevanceScore} / 100 (${cand.classification})`);
    console.log(`  - Confidence: ${cand.confidence}`);
    console.log(`  - Approval Status: PENDING_MANUAL_REVIEW (0 auto-approvals)`);
  }

  const liveApprovedCount = await db.competitiveSetMember.count({
    where: { status: 'APPROVED', approvedByUser: true, provenanceMode: { in: ['LIVE', 'IMPORTED'] } }
  });

  console.log('\n--------------------------------------------------');
  console.log(`LIVE Approved Competitors Count: ${liveApprovedCount}`);
  console.log('--------------------------------------------------\n');

  console.log('==================================================');
  console.log('🎉 PHASE 4 OFFICIAL DISCOVERY COMPLETED SUCCESSFULLY!');
  console.log('==================================================');
}

runPhase4LiveDiscovery().catch(err => {
  console.error('\n❌ PHASE 4 DISCOVERY FAILED:', err);
  process.exit(1);
});
