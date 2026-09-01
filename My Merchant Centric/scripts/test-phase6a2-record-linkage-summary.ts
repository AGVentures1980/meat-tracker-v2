import { db } from '../src/lib/db';
import { runPhase6A2AuditAndIntelligence } from '../src/lib/scout/reputationIntelligenceEngine';

async function runPhase6A2SummaryTest() {
  console.log('==================================================');
  console.log('PHASE 6A-2 — RECORD LINKAGE & SUBSTRING INVARIANT REGRESSION TEST');
  console.log('==================================================\n');

  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Texas location missing!');

  const report = await runPhase6A2AuditAndIntelligence(texasLoc.id);

  // 1. Verify Source Metrics
  console.log(`[TEST 1] Verifying Source Metrics Reconciliation:`);
  console.log(`  • Google: Count = ${report.sourceMetrics.googleCount} | Sum = ${report.sourceMetrics.googleRatingSum} | Avg = ${report.sourceMetrics.googleDisplayRating}`);
  console.log(`  • OpenTable: Count = ${report.sourceMetrics.openTableCount} | Sum = ${report.sourceMetrics.openTableRatingSum} | Avg = ${report.sourceMetrics.openTableDisplayRating}`);
  console.log(`  • Total: Count = ${report.sourceMetrics.totalCount} | Sum = ${report.sourceMetrics.totalRatingSum} | Avg = ${report.sourceMetrics.totalDisplayRating}`);

  if (report.sourceMetrics.googleCount !== 14 || report.sourceMetrics.googleRatingSum !== 60 || report.sourceMetrics.googleDisplayRating !== '4.29★') {
    throw new Error('FAIL: Google source metrics do not match expected (14 / 60 / 4.29★)!');
  }

  if (report.sourceMetrics.openTableCount !== 19 || report.sourceMetrics.openTableRatingSum !== 76 || report.sourceMetrics.openTableDisplayRating !== '4.00★') {
    throw new Error('FAIL: OpenTable source metrics do not match expected (19 / 76 / 4.00★)!');
  }

  if (report.sourceMetrics.totalTextBearingCount !== 15 || report.sourceMetrics.totalRatingOnlyCount !== 18) {
    throw new Error('FAIL: Text-bearing (15) / Rating-only (18) breakdown mismatch!');
  }
  console.log('✔ PASS: Google (14/60/4.29★), OpenTable (19/76/4.00★), and Text counts (15 text / 18 blank) match source audit 100%.\n');

  // 2. Verify William Mccann Source Record
  console.log(`[TEST 2] Verifying William Mccann Source Record:`);
  const william = report.canonicalSourceManifest.find(m => m.reviewId === 'RT-60256-6a8c9442e080750001fb092b');
  if (!william) throw new Error('FAIL: William Mccann record missing from manifest!');

  console.log(`  • Review ID: ${william.reviewId} | Guest: "${william.guestName}" | Source: ${william.source} | Rating: ${william.rating}★`);

  if (william.rating !== 2.0 || william.guestName !== 'William Mccann' || william.source !== 'Google') {
    throw new Error('FAIL: William Mccann source record parameters corrupted!');
  }
  console.log('✔ PASS: William Mccann source record matches authentic CSV parameters 100%.\n');

  // 3. Verify Competitor Signals Separation & Ambiguity
  console.log(`[TEST 3] Verifying Competitor Signals Separation & Ambiguity:`);
  console.log(`  • Competitor Signals Count: ${report.competitorMentionTable.length}`);

  const rodizioSignal = report.competitorMentionTable.find(c => c.rawCompetitorPhrase === 'Rodizio');
  if (!rodizioSignal || rodizioSignal.resolutionStatus !== 'AMBIGUOUS' || rodizioSignal.normalizedCompetitor !== null) {
    throw new Error('FAIL: Ambiguous Rodizio incorrectly mapped to Rodizio Grill!');
  }

  const terraGauchaSignal = report.competitorMentionTable.find(c => c.rawCompetitorPhrase === 'Terra Gaucho');
  if (!terraGauchaSignal || terraGauchaSignal.evidenceChannel !== 'PRIVATE_NOTE' || terraGauchaSignal.normalizedCompetitor !== 'Terra Gaucha Brazilian Steakhouse - Tampa') {
    throw new Error('FAIL: Terra Gaucha private-note competitor signal not preserved correctly!');
  }
  console.log('✔ PASS: Ambiguous Rodizio retained as AMBIGUOUS and Terra Gaucha private note preserved as PRIVATE_NOTE.\n');

  // 4. Downstream Production State Check
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
  console.log('🎉 ALL PHASE 6A-2 REGRESSION VERIFICATIONS PASSED!');
  console.log('==================================================');
}

runPhase6A2SummaryTest().catch(err => {
  console.error('\n❌ PHASE 6A-2 SUMMARY FAILED:', err);
  process.exit(1);
});
