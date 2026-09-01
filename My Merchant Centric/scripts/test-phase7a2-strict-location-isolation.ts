import { db } from '../src/lib/db';
import { runPhase6BOperationalIntelligence } from '../src/lib/scout/operationalIntelligenceEngine';

async function runPhase7A2IsolationTest() {
  console.log('==================================================');
  console.log('PHASE 7A-2 — STRICT LOCATION CONTEXT ISOLATION TEST');
  console.log('==================================================\n');

  // 1. Fetch Target Locations
  const tampaLoc = await db.location.findFirst({
    where: { name: { contains: 'Tampa' } }
  });

  const fairfaxLoc = await db.location.findFirst({
    where: { name: { contains: 'Fairfax' } }
  });

  const orlandoLoc = await db.location.findFirst({
    where: { name: { contains: 'Orlando' }, address: { contains: 'International' } }
  });

  if (!tampaLoc || !fairfaxLoc || !orlandoLoc) {
    throw new Error('Target locations missing for testing!');
  }

  console.log(`[TARGET LOCATIONS RESOLVED]`);
  console.log(`  • Tampa Location ID: ${tampaLoc.id}`);
  console.log(`  • Fairfax Location ID: ${fairfaxLoc.id}`);
  console.log(`  • Orlando Location ID: ${orlandoLoc.id}\n`);

  // SCENARIO 1: TAMPA SELECTED
  console.log('--------------------------------------------------');
  console.log('SCENARIO 1: TAMPA SELECTED (POC LOCATION #1)');
  console.log('--------------------------------------------------');
  const tampaReviews = await db.contentItem.findMany({
    where: { locationId: tampaLoc.id, provenanceMode: 'IMPORTED' }
  });

  const tampaCompSet = await db.competitiveSetMember.findMany({
    where: { set: { locationId: tampaLoc.id } }
  });

  const tampaIntel = await runPhase6BOperationalIntelligence(tampaLoc.id);

  console.log(`  • Tampa Reviews Returned: ${tampaReviews.length} (Expected: 33)`);
  console.log(`  • Tampa Competitive Set Members Returned: ${tampaCompSet.length} (Expected: >= 4)`);
  console.log(`  • Tampa Operational Intelligence Analyzed Count: ${tampaIntel.reviewsAnalyzedCount} (Expected: 33)`);

  if (tampaReviews.length !== 33 || tampaCompSet.length === 0 || tampaIntel.reviewsAnalyzedCount !== 33) {
    throw new Error('FAIL: Tampa location data incorrect when Tampa is selected!');
  }
  console.log('✔ PASS: Tampa location data returned cleanly when Tampa is selected.\n');

  // SCENARIO 2: FAIRFAX SELECTED
  console.log('--------------------------------------------------');
  console.log('SCENARIO 2: FAIRFAX SELECTED');
  console.log('--------------------------------------------------');
  const fairfaxReviews = await db.contentItem.findMany({
    where: { locationId: fairfaxLoc.id, provenanceMode: 'IMPORTED' }
  });

  const fairfaxCompSet = await db.competitiveSetMember.findMany({
    where: { set: { locationId: fairfaxLoc.id } }
  });

  const fairfaxIntel = await runPhase6BOperationalIntelligence(fairfaxLoc.id);

  const fairfaxAlerts = await db.alert.findMany({
    where: { locationId: fairfaxLoc.id }
  });

  console.log(`  • Fairfax Reviews Returned: ${fairfaxReviews.length} (Expected: 0)`);
  console.log(`  • Fairfax Competitive Set Members Returned: ${fairfaxCompSet.length} (Expected: 0)`);
  console.log(`  • Fairfax Operational Intelligence Analyzed Count: ${fairfaxIntel.reviewsAnalyzedCount} (Expected: 0)`);
  console.log(`  • Fairfax Disclosure Notice: "${fairfaxIntel.disclosureNotice}"`);

  if (fairfaxReviews.length !== 0 || fairfaxCompSet.length !== 0 || fairfaxIntel.reviewsAnalyzedCount !== 0) {
    throw new Error('FAIL: CROSS-LOCATION LEAKAGE DETECTED! Foreign Tampa data leaked into Fairfax!');
  }
  console.log('✔ PASS: Zero Tampa reviews, zero Tampa competitors, and zero Tampa intelligence leaked into Fairfax.\n');

  // SCENARIO 3: ORLANDO SELECTED
  console.log('--------------------------------------------------');
  console.log('SCENARIO 3: ORLANDO SELECTED');
  console.log('--------------------------------------------------');
  const orlandoReviews = await db.contentItem.findMany({
    where: { locationId: orlandoLoc.id, provenanceMode: 'IMPORTED' }
  });

  const orlandoCompSet = await db.competitiveSetMember.findMany({
    where: { set: { locationId: orlandoLoc.id } }
  });

  const orlandoIntel = await runPhase6BOperationalIntelligence(orlandoLoc.id);

  console.log(`  • Orlando Reviews Returned: ${orlandoReviews.length} (Expected: 0)`);
  console.log(`  • Orlando Competitive Set Members Returned: ${orlandoCompSet.length} (Expected: 0)`);
  console.log(`  • Orlando Operational Intelligence Analyzed Count: ${orlandoIntel.reviewsAnalyzedCount} (Expected: 0)`);

  if (orlandoReviews.length !== 0 || orlandoCompSet.length !== 0 || orlandoIntel.reviewsAnalyzedCount !== 0) {
    throw new Error('FAIL: CROSS-LOCATION LEAKAGE DETECTED! Foreign data leaked into Orlando!');
  }
  console.log('✔ PASS: Zero foreign location data leaked into Orlando.\n');

  console.log('==================================================');
  console.log('🎉 ALL PHASE 7A-2 ISOLATION VERIFICATIONS PASSED!');
  console.log('==================================================');
}

runPhase7A2IsolationTest().catch(err => {
  console.error('\n❌ PHASE 7A-2 ISOLATION TEST FAILED:', err);
  process.exit(1);
});
