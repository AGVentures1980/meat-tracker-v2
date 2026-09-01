export interface CompetitorEvidence {
  serviceModel?: string;
  cuisineCategory?: string;
  priceTier?: string;
  occasions?: string[];
  distanceMiles?: number;
  latitude?: number;
  longitude?: number;
  googleRating?: number;
  reviewCount?: number;
  placeId?: string;
  brandName?: string;
  provenanceSource?: 'GOOGLE_PLACES' | 'CLIENT_IMPORT' | 'MANUAL' | 'AI_DERIVED';
}

export interface RelevanceConfig {
  weights?: {
    serviceModel?: number; // default 0.25
    cuisine?: number;      // default 0.20
    priceTier?: number;    // default 0.15
    occasion?: number;     // default 0.15
    proximity?: number;    // default 0.15
    brandMarket?: number;  // default 0.05
    marketScale?: number;  // default 0.05
  };
  tradeAreaRadiusMiles?: number; // default 15 miles
}

export interface DimensionScore {
  score: number | null;
  evidence: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  isUnknown: boolean;
}

export interface RelevanceEvaluationResult {
  relevanceScore: number;
  relevanceClassification: 'DIRECT_COMPETITOR_CANDIDATE' | 'STRONG_COMPETITOR_CANDIDATE' | 'SECONDARY_COMPETITOR_CANDIDATE' | 'LOW_RELEVANCE';
  recommendedCompetitiveRole: 'DIRECT' | 'SECONDARY' | 'WATCHLIST' | 'LOW_RELEVANCE';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  distanceMiles: number;
  dimensions: {
    serviceModel: DimensionScore;
    cuisine: DimensionScore;
    priceTier: DimensionScore;
    occasion: DimensionScore;
    proximity: DimensionScore;
    brandMarket: DimensionScore;
    marketScale: DimensionScore;
  };
  serviceModelFitScore: number;
  cuisineFitScore: number;
  priceTierFitScore: number;
  occasionFitScore: number;
  proximityScore: number;
  brandFitScore: number;
  marketScaleScore: number;
  explanation: string;
  evidence: CompetitorEvidence;
}

/**
 * Calculates Haversine distance in miles between two coordinate pairs.
 */
export function calculateDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Radius of Earth in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

/**
 * Evaluates candidate competitor relevance against a subject location.
 * Decouples raw relevanceScore (0-100) from recommendedCompetitiveRole (DIRECT | SECONDARY | WATCHLIST | LOW_RELEVANCE).
 */
export function evaluateCompetitiveRelevance(
  subject: {
    name: string;
    latitude?: number | null;
    longitude?: number | null;
    serviceModel?: string | null;
    priceTier?: string | null;
  },
  candidate: {
    name: string;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    serviceModel?: string | null;
    priceTier?: string | null;
    googleRating?: number | null;
    reviewCount?: number | null;
    placeId?: string | null;
  },
  config: RelevanceConfig = {}
): RelevanceEvaluationResult {
  const weights = {
    serviceModel: config.weights?.serviceModel ?? 0.25,
    cuisine: config.weights?.cuisine ?? 0.20,
    priceTier: config.weights?.priceTier ?? 0.15,
    occasion: config.weights?.occasion ?? 0.15,
    proximity: config.weights?.proximity ?? 0.15,
    brandMarket: config.weights?.brandMarket ?? 0.05,
    marketScale: config.weights?.marketScale ?? 0.05,
  };

  const nameLower = candidate.name.toLowerCase();
  const addressLower = (candidate.address || '').toLowerCase();
  let unknownCount = 0;

  // 1. Proximity
  let distanceMiles = 5.0;
  let proximityScore = 50;
  let proximityEvidence = 'Proximity calculated from coordinates';

  if (subject.latitude && subject.longitude && candidate.latitude && candidate.longitude) {
    distanceMiles = calculateDistanceMiles(subject.latitude, subject.longitude, candidate.latitude, candidate.longitude);
    if (distanceMiles <= 3.0) proximityScore = 100;
    else if (distanceMiles <= 6.0) proximityScore = 80;
    else if (distanceMiles <= 10.0) proximityScore = 60;
    else if (distanceMiles <= 15.0) proximityScore = 40;
    else proximityScore = 10;
    proximityEvidence = `${distanceMiles} mi away from subject location`;
  } else {
    unknownCount++;
    proximityEvidence = 'UNKNOWN (Missing physical coordinates)';
  }

  // 2. Service Model Fit
  const isFoodTruck = nameLower.includes('food truck') || nameLower.includes('truck') || addressLower.includes('food truck') || (candidate.serviceModel && candidate.serviceModel.toLowerCase().includes('truck'));
  const isChurrascaria = nameLower.includes('churrascaria') || nameLower.includes('rodizio') || nameLower.includes('brazilian steakhouse');
  const isTraditionalSteakhouse = (nameLower.includes('steakhouse') || nameLower.includes('steak house')) && !isChurrascaria;

  let serviceModelScore = 50;
  let serviceModelEvidence = '';

  if (isFoodTruck) {
    serviceModelScore = 20; // Mobile Food Truck
    serviceModelEvidence = 'Mobile Food Truck format — incompatible with premium full-service rodizio experience';
  } else if (isChurrascaria) {
    serviceModelScore = 100;
    serviceModelEvidence = 'Full-service Churrascaria / Rodizio operating model';
  } else if (isTraditionalSteakhouse) {
    serviceModelScore = 70; // Premium Traditional Steakhouse (e.g. Charley's, Fleming's)
    serviceModelEvidence = 'Full-service Traditional Steakhouse (à-la-carte format, non-rodizio)';
  } else if (nameLower.includes('grill')) {
    serviceModelScore = 50;
    serviceModelEvidence = 'Casual Grill / Restaurant format';
  } else {
    unknownCount++;
    serviceModelScore = 40;
    serviceModelEvidence = 'UNKNOWN (Unspecified service format)';
  }

  // 3. Cuisine Fit (20%)
  let cuisineScore = 30;
  let cuisineEvidence = '';

  if (nameLower.includes('brazilian') || nameLower.includes('churras') || nameLower.includes('gaucha') || nameLower.includes('gaúcha')) {
    cuisineScore = 100;
    cuisineEvidence = 'Brazilian Churrasco / Meat-centric rodizio cuisine';
  } else if (nameLower.includes('steak') || nameLower.includes('prime') || nameLower.includes('meat')) {
    cuisineScore = 80;
    cuisineEvidence = 'Steakhouse / Prime beef menu focus';
  } else {
    cuisineScore = 40;
    cuisineEvidence = 'General American / International menu';
  }

  // 4. Price Tier Fit (15%)
  let priceScore = 50;
  let priceEvidence = '';
  const priceLevelStr = (candidate.priceTier || '').toUpperCase();

  if (priceLevelStr.includes('EXPENSIVE') || priceLevelStr.includes('$$$$') || priceLevelStr.includes('PRICE_LEVEL_EXPENSIVE') || priceLevelStr.includes('PRICE_LEVEL_VERY_EXPENSIVE')) {
    priceScore = 100;
    priceEvidence = `Matching Upper-Midscale / Premium Price Tier (${candidate.priceTier})`;
  } else if (priceLevelStr.includes('MODERATE') || priceLevelStr.includes('$$')) {
    priceScore = isFoodTruck ? 20 : 40;
    priceEvidence = `Moderate Price Tier (${candidate.priceTier}) — spend gap vs premium churrascaria`;
  } else if (priceLevelStr.includes('INEXPENSIVE') || priceLevelStr.includes('$')) {
    priceScore = 20;
    priceEvidence = `Inexpensive Price Tier (${candidate.priceTier}) — significant spend mismatch`;
  } else {
    unknownCount++;
    priceScore = 50;
    priceEvidence = 'UNKNOWN (Price level omitted in Google Places payload)';
  }

  // 5. Occasion Fit (15%)
  let occasionScore = 50;
  let occasionEvidence = '';

  if (isChurrascaria && !isFoodTruck) {
    occasionScore = 95;
    occasionEvidence = 'High Occasion Overlap: Celebration / Group Dining / Special Occasion';
  } else if (isTraditionalSteakhouse) {
    occasionScore = 85;
    occasionEvidence = 'High Occasion Overlap: Business Dinner / Date Night / Celebration';
  } else if (isFoodTruck) {
    occasionScore = 25;
    occasionEvidence = 'Low Occasion Overlap: Quick Casual / On-the-go meal';
  } else {
    unknownCount++;
    occasionScore = 50;
    occasionEvidence = 'UNKNOWN (Insufficient occasion signals)';
  }

  // 6. Brand / Market Position (5%)
  let brandScore = 50;
  let brandEvidence = '';

  if (isChurrascaria && !isFoodTruck) {
    brandScore = 90;
    brandEvidence = 'Established Churrascaria Brand positioning';
  } else if (isTraditionalSteakhouse) {
    brandScore = 80;
    brandEvidence = 'Established Premium Steakhouse Brand positioning';
  } else {
    brandScore = 50;
    brandEvidence = 'Local / Independent Store positioning';
  }

  // 7. Market / Review Scale Fit (5%)
  let scaleScore = 50;
  let scaleEvidence = '';
  const reviews = candidate.reviewCount || 0;

  if (reviews > 3000) {
    scaleScore = 100;
    scaleEvidence = `Substantial Market Footprint: ${reviews.toLocaleString()} Google reviews (${candidate.googleRating || 0}★)`;
  } else if (reviews > 1000) {
    scaleScore = 80;
    scaleEvidence = `Established Market Footprint: ${reviews.toLocaleString()} Google reviews (${candidate.googleRating || 0}★)`;
  } else if (reviews > 200) {
    scaleScore = 50;
    scaleEvidence = `Moderate Market Footprint: ${reviews.toLocaleString()} Google reviews (${candidate.googleRating || 0}★)`;
  } else {
    scaleScore = reviews <= 50 ? 10 : 30;
    scaleEvidence = `Small / Emerging Footprint: ${reviews.toLocaleString()} Google reviews (${candidate.googleRating || 0}★)`;
  }

  // Calculate Weighted Total Score (Capped at 95 to avoid false precision)
  let totalScoreRaw = Math.min(95, Math.round(
    serviceModelScore * weights.serviceModel +
    cuisineScore * weights.cuisine +
    priceScore * weights.priceTier +
    occasionScore * weights.occasion +
    proximityScore * weights.proximity +
    brandScore * weights.brandMarket +
    scaleScore * weights.marketScale
  ));

  // Classification (Numeric Score Threshold)
  let classification: RelevanceEvaluationResult['relevanceClassification'] = 'LOW_RELEVANCE';
  if (totalScoreRaw >= 80) classification = 'DIRECT_COMPETITOR_CANDIDATE';
  else if (totalScoreRaw >= 60) classification = 'STRONG_COMPETITOR_CANDIDATE';
  else if (totalScoreRaw >= 40) classification = 'SECONDARY_COMPETITOR_CANDIDATE';

  // STRUCTURAL COMPETITIVE ROLE GATE (Decoupled from numeric score!)
  let recommendedRole: RelevanceEvaluationResult['recommendedCompetitiveRole'] = 'LOW_RELEVANCE';

  if (isFoodTruck) {
    // Rule: Food Trucks CANNOT be DIRECT or SECONDARY. Recommended strictly as WATCHLIST or LOW_RELEVANCE
    recommendedRole = reviews >= 100 ? 'WATCHLIST' : 'LOW_RELEVANCE';
  } else if (isChurrascaria && serviceModelScore >= 90 && distanceMiles <= 15.0) {
    // Rule: Full-service Brazilian Churrascaria / Rodizio in trade area = DIRECT
    recommendedRole = 'DIRECT';
  } else if (isTraditionalSteakhouse) {
    // Rule: Traditional Premium Steakhouses (Charley's, Fleming's) = SECONDARY (High relevance spend, different service format)
    recommendedRole = 'SECONDARY';
  } else if (nameLower.includes('grill') || isChurrascaria) {
    // Rule: Casual Brazilian Grills / Moderate concepts = SECONDARY
    recommendedRole = 'SECONDARY';
  } else if (reviews <= 50) {
    // Rule: Tiny footprint or uncertain concept = WATCHLIST
    recommendedRole = 'WATCHLIST';
  } else if (totalScoreRaw >= 50) {
    recommendedRole = 'SECONDARY';
  }

  // Confidence Calculation
  let overallConfidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
  if (unknownCount >= 2 || !candidate.priceTier || candidate.priceTier === 'N/A' || candidate.priceTier === 'UNKNOWN') {
    overallConfidence = unknownCount >= 3 ? 'LOW' : 'MEDIUM';
  }

  const explanation = `${candidate.name} has a Competitive Relevance Score of ${totalScoreRaw}/100 with recommended role [${recommendedRole}]: ${serviceModelEvidence}; ${cuisineEvidence}; ${proximityEvidence}.`;

  return {
    relevanceScore: totalScoreRaw,
    relevanceClassification: classification,
    recommendedCompetitiveRole: recommendedRole,
    confidence: overallConfidence,
    distanceMiles,
    dimensions: {
      serviceModel: { score: serviceModelScore, evidence: serviceModelEvidence, confidence: 'HIGH', isUnknown: serviceModelEvidence.includes('UNKNOWN') },
      cuisine: { score: cuisineScore, evidence: cuisineEvidence, confidence: 'HIGH', isUnknown: false },
      priceTier: { score: priceScore, evidence: priceEvidence, confidence: candidate.priceTier ? 'HIGH' : 'LOW', isUnknown: !candidate.priceTier },
      occasion: { score: occasionScore, evidence: occasionEvidence, confidence: isFoodTruck || isChurrascaria || isTraditionalSteakhouse ? 'HIGH' : 'LOW', isUnknown: occasionEvidence.includes('UNKNOWN') },
      proximity: { score: proximityScore, evidence: proximityEvidence, confidence: 'HIGH', isUnknown: false },
      brandMarket: { score: brandScore, evidence: brandEvidence, confidence: 'HIGH', isUnknown: false },
      marketScale: { score: scaleScore, evidence: scaleEvidence, confidence: 'HIGH', isUnknown: false }
    },
    serviceModelFitScore: serviceModelScore,
    cuisineFitScore: cuisineScore,
    priceTierFitScore: priceScore,
    occasionFitScore: occasionScore,
    proximityScore,
    brandFitScore: brandScore,
    marketScaleScore: scaleScore,
    explanation,
    evidence: {
      serviceModel: serviceModelEvidence,
      cuisineCategory: cuisineEvidence,
      priceTier: candidate.priceTier || 'UNKNOWN',
      distanceMiles,
      googleRating: candidate.googleRating || undefined,
      reviewCount: candidate.reviewCount || undefined,
      placeId: candidate.placeId || undefined,
      brandName: candidate.name,
      provenanceSource: 'GOOGLE_PLACES'
    }
  };
}
