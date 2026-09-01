import { db } from '../src/lib/db';
import { runPhase6BOperationalIntelligence } from '../src/lib/scout/operationalIntelligenceEngine';

async function runPhase6BSummaryTest() {
  console.log('==================================================');
  console.log('PHASE 6B — OPERATIONAL INTELLIGENCE REGRESSION TEST');
  console.log('==================================================\n');

  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Texas location missing!');

  const report = await runPhase6BOperationalIntelligence(texasLoc.id);

  // 1. Verify Scope & Invariants
  console.log(`[TEST 1] Verifying System Invariants & Official Score Status:`);
  console.log(`  • Reviews Analyzed: ${report.reviewsAnalyzedCount}`);
  console.log(`  • Official Brand Pulse Status: ${report.officialBrandPulseStatus}`);

  if (report.reviewsAnalyzedCount !== 33) {
    throw new Error(`FAIL: Expected 33 reviews analyzed, got ${report.reviewsAnalyzedCount}`);
  }

  if (!report.officialBrandPulseStatus.includes('OFFICIALLY_DISABLED')) {
    throw new Error('FAIL: Official Brand Pulse score was erroneously activated!');
  }
  console.log('✔ PASS: 33 authentic reviews analyzed; Official Brand Pulse score remains OFFICIALLY_DISABLED.\n');

  // 2. Verify Recurrence Rule (>= 2 records required)
  console.log(`[TEST 2] Verifying Recurrence Rule (>= 2 records for RECURRING status):`);
  report.recurringIssues.forEach(ri => {
    console.log(`  • Topic: ${ri.topicCategory} | Count: ${ri.reviewCount} | Status: ${ri.recurrenceStatus}`);
    if (ri.reviewCount >= 2 && ri.recurrenceStatus !== 'RECURRING') {
      throw new Error(`FAIL: Topic ${ri.topicCategory} has ${ri.reviewCount} reviews but is not marked RECURRING!`);
    }
    if (ri.reviewCount < 2 && ri.recurrenceStatus === 'RECURRING') {
      throw new Error(`FAIL: Topic ${ri.topicCategory} has only ${ri.reviewCount} review but was marked RECURRING!`);
    }
  });
  console.log('✔ PASS: Recurrence rule (>= 2 records required for RECURRING) strictly enforced.\n');

  // 3. Verify Competitor Separation & Ambiguity
  console.log(`[TEST 3] Verifying Competitor Signals Separation & Ambiguity:`);
  const privNoteComp = report.competitorChurnSignals.find(c => c.rawPhrase === 'Terra Gaucho');
  const ambigComp = report.competitorChurnSignals.find(c => c.rawPhrase === 'Rodizio');

  if (!privNoteComp || privNoteComp.evidenceChannel !== 'PRIVATE_NOTE') {
    throw new Error('FAIL: Private note competitor signal not kept separate!');
  }

  if (!ambigComp || ambigComp.resolutionStatus !== 'AMBIGUOUS' || ambigComp.normalizedCompetitor !== null) {
    throw new Error('FAIL: Ambiguous Rodizio was incorrectly resolved!');
  }
  console.log('✔ PASS: Private note competitor signal kept separate and ambiguous Rodizio left unresolved.\n');

  // 4. Downstream Production DB Verification (0 alerts, 0 recovery cases created)
  const reviewAlerts = await db.alert.count({
    where: { locationId: texasLoc.id, alertType: { in: ['REVIEW_SENTIMENT', 'GUEST_RECOVERY', 'NEGATIVE_REVIEW'] } }
  });

  const reviewRecoveryCases = await db.recoveryCase.count({
    where: { locationId: texasLoc.id, contentItem: { provenanceMode: 'IMPORTED' } }
  });

  console.log(`[TEST 4] Downstream Production State Check:`);
  console.log(`  • Production Review Alerts: ${reviewAlerts}`);
  console.log(`  • Production Recovery Cases: ${reviewRecoveryCases}`);

  if (reviewAlerts !== 0 || reviewRecoveryCases !== 0) {
    throw new Error('FAIL: Production alerts or recovery cases created!');
  }
  console.log('✔ PASS: Zero production alerts or recovery cases created.\n');

  console.log('==================================================');
  console.log('🎉 ALL PHASE 6B REGRESSION VERIFICATIONS PASSED!');
  console.log('==================================================');
}

runPhase6BSummaryTest().catch(err => {
  console.error('\n❌ PHASE 6B SUMMARY FAILED:', err);
  process.exit(1);
});
