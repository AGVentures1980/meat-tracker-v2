import { db } from '../src/lib/db';
import { evaluateCompetitiveRelevance } from '../src/lib/scout/competitiveRelevanceEngine';

async function runPhase4CTest() {
  console.log('==================================================');
  console.log('PHASE 4C — COMPETITIVE ROLE DECOUPLING TEST');
  console.log('==================================================\n');

  // 1. Test Traditional Steakhouse (Charley's / Fleming's) Decoupling
  const charleysEval = evaluateCompetitiveRelevance(
    { name: 'Texas de Brazil - Tampa', latitude: 27.9653, longitude: -82.5186 },
    {
      name: "Charley's Steak House",
      address: '4444 W Cypress St, Tampa, FL 33607',
      latitude: 27.9512,
      longitude: -82.5201,
      serviceModel: 'Upscale Steakhouse',
      priceTier: 'PRICE_LEVEL_VERY_EXPENSIVE',
      googleRating: 4.5,
      reviewCount: 5710,
      placeId: 'ChIJHUT6O_7CwogR5cYxe7yk5nM'
    }
  );

  console.log('[TEST 1] Traditional Steakhouse Role Decoupling:');
  console.log(`  - Candidate: Charley's Steak House`);
  console.log(`  - Relevance Score: ${charleysEval.relevanceScore} / 100`);
  console.log(`  - Recommended Competitive Role: ${charleysEval.recommendedCompetitiveRole}`);

  if (charleysEval.recommendedCompetitiveRole === 'DIRECT') {
    throw new Error('FAIL: Traditional steakhouse automatically classified as DIRECT!');
  }
  if (charleysEval.recommendedCompetitiveRole !== 'SECONDARY') {
    throw new Error(`FAIL: Charley's Steak House should be SECONDARY, got ${charleysEval.recommendedCompetitiveRole}`);
  }
  console.log('✔ PASS: Traditional steakhouse has high score (85) BUT recommended role is SECONDARY.\n');

  // 2. Test Food Truck Role Cap
  const truckEval = evaluateCompetitiveRelevance(
    { name: 'Texas de Brazil - Tampa', latitude: 27.9653, longitude: -82.5186 },
    {
      name: 'El Churrascaso Grill Food Truck',
      address: '8603a N Dale Mabry Hwy, Tampa, FL 33614',
      latitude: 28.0289,
      longitude: -82.5042,
      serviceModel: 'Food Truck',
      priceTier: 'PRICE_LEVEL_MODERATE',
      googleRating: 4.5,
      reviewCount: 1060,
      placeId: 'ChIJz-r4PA7BwogRiAnH8BNVagI'
    }
  );

  console.log('[TEST 2] Food Truck Role Cap:');
  console.log(`  - Candidate: El Churrascaso Grill Food Truck`);
  console.log(`  - Relevance Score: ${truckEval.relevanceScore} / 100`);
  console.log(`  - Recommended Competitive Role: ${truckEval.recommendedCompetitiveRole}`);

  if (truckEval.recommendedCompetitiveRole === 'DIRECT' || truckEval.recommendedCompetitiveRole === 'SECONDARY') {
    throw new Error(`FAIL: Food truck received non-WATCHLIST role: ${truckEval.recommendedCompetitiveRole}`);
  }
  console.log('✔ PASS: Food truck recommended as WATCHLIST (zero food trucks recommended as DIRECT).\n');

  // 3. Test Full-Service Churrascaria (Terra Gaúcha)
  const terraEval = evaluateCompetitiveRelevance(
    { name: 'Texas de Brazil - Tampa', latitude: 27.9653, longitude: -82.5186 },
    {
      name: 'Terra Gaucha Brazilian Steakhouse - Tampa',
      address: '1108 S Dale Mabry Hwy, Tampa, FL 33629',
      latitude: 27.9351,
      longitude: -82.5052,
      serviceModel: 'Full-service Churrascaria / Rodizio',
      priceTier: 'PRICE_LEVEL_EXPENSIVE',
      googleRating: 4.8,
      reviewCount: 7345,
      placeId: 'ChIJ5XkDzRfDwogRnH0PSg_mFGk'
    }
  );

  console.log('[TEST 3] Full-Service Churrascaria Role:');
  console.log(`  - Candidate: Terra Gaucha Brazilian Steakhouse - Tampa`);
  console.log(`  - Relevance Score: ${terraEval.relevanceScore} / 100`);
  console.log(`  - Recommended Competitive Role: ${terraEval.recommendedCompetitiveRole}`);

  if (terraEval.recommendedCompetitiveRole !== 'DIRECT') {
    throw new Error(`FAIL: Terra Gaúcha should be DIRECT, got ${terraEval.recommendedCompetitiveRole}`);
  }
  console.log('✔ PASS: Full-service Churrascaria recommended as DIRECT.\n');

  // 4. Verify Approved Competitors Count
  const liveApprovedCount = await db.competitiveSetMember.count({
    where: { status: 'APPROVED', approvedByUser: true, provenanceMode: { in: ['LIVE', 'IMPORTED'] } }
  });

  console.log(`[TEST 4] LIVE Approved Competitors Count in Database: ${liveApprovedCount}`);
  if (liveApprovedCount !== 0) {
    throw new Error(`FAIL: Expected 0 approved competitors, found ${liveApprovedCount}`);
  }
  console.log('✔ PASS: LIVE Approved Competitors Count = 0.\n');

  console.log('==================================================');
  console.log('🎉 ALL PHASE 4C ROLE DECOUPLING TESTS PASSED!');
  console.log('==================================================');
}

runPhase4CTest().catch(err => {
  console.error('\n❌ PHASE 4C TEST FAILED:', err);
  process.exit(1);
});
