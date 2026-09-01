import { db } from '../src/lib/db';
import { runPhase6A2AuditAndIntelligence } from '../src/lib/scout/reputationIntelligenceEngine';

async function runPhase6ASummaryTest() {
  console.log('==================================================');
  console.log('PHASE 6A — EVIDENCE LINKAGE & BLANK REVIEW REGRESSION TEST');
  console.log('==================================================\n');

  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Texas location missing!');

  const report = await runPhase6A2AuditAndIntelligence(texasLoc.id);

  // 1. Verify Analyzed Count
  console.log(`[TEST 1] Canonical Reviews Analyzed: ${report.sourceMetrics.totalCount}`);
  if (report.sourceMetrics.totalCount !== 33) {
    throw new Error(`Expected 33 reviews analyzed, found ${report.sourceMetrics.totalCount}`);
  }
  console.log('✔ PASS: Exact 33 authentic canonical reviews analyzed.\n');

  // 2. Verify Blank Reviews (Rating-Only) Sentiment Exclusion
  console.log(`[TEST 2] Verifying Rating-Only Reviews Exclusion from Text Sentiment:`);
  console.log(`  • Reviews with Text: ${report.sourceMetrics.totalTextBearingCount}`);
  console.log(`  • Rating-Only Reviews (Blank Text): ${report.sourceMetrics.totalRatingOnlyCount}`);

  // Check DB to ensure zero SentimentAnalysis records created for blank text reviews
  const blankTextReviews = await db.contentItem.findMany({
    where: { locationId: texasLoc.id, provenanceMode: 'IMPORTED', text: '' },
    include: { sentimentAnalysis: true }
  });

  const blankWithSentiment = blankTextReviews.filter(r => r.sentimentAnalysis !== null);
  if (blankWithSentiment.length > 0) {
    throw new Error(`FAIL: ${blankWithSentiment.length} blank-text reviews received text-derived sentiment!`);
  }
  console.log('✔ PASS: Zero text-derived sentiment assigned to blank-text / rating-only reviews.\n');

  // 3. Downstream AI & Alert State Verification
  const reviewAlerts = await db.alert.count({
    where: { locationId: texasLoc.id, alertType: { in: ['REVIEW_SENTIMENT', 'GUEST_RECOVERY', 'NEGATIVE_REVIEW'] } }
  });

  const reviewRecoveryCases = await db.recoveryCase.count({
    where: { locationId: texasLoc.id, contentItem: { provenanceMode: 'IMPORTED' } }
  });

  console.log(`[TEST 3] Downstream Production State Check:`);
  console.log(`  • Production Review Alerts: ${reviewAlerts}`);
  console.log(`  • Production Recovery Cases: ${reviewRecoveryCases}`);

  if (reviewAlerts !== 0 || reviewRecoveryCases !== 0) {
    throw new Error('FAIL: Production alerts or recovery cases created!');
  }
  console.log('✔ PASS: Zero production alerts or recovery cases created.\n');

  console.log('==================================================');
  console.log('🎉 ALL PHASE 6A VERIFICATIONS PASSED!');
  console.log('==================================================');
}

runPhase6ASummaryTest().catch(err => {
  console.error('\n❌ PHASE 6A SUMMARY FAILED:', err);
  process.exit(1);
});
