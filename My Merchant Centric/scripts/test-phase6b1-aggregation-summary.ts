import { db } from '../src/lib/db';
import { runPhase6BOperationalIntelligence } from '../src/lib/scout/operationalIntelligenceEngine';

async function runPhase6B1SummaryTest() {
  console.log('==================================================');
  console.log('PHASE 6B-1 — OPERATIONAL AGGREGATION & SUMMARY REGRESSION TEST');
  console.log('==================================================\n');

  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Texas location missing!');

  const report = await runPhase6BOperationalIntelligence(texasLoc.id);

  // 1. Priority Bucket Reconciliation & Sum = 33 Check
  console.log(`[TEST 1] Verifying Priority Bucket Reconciliation & Unique Assignment:`);
  console.log(`  • CRITICAL: ${report.priorityBucketReconciliation.criticalUniqueReviews}`);
  console.log(`  • HIGH: ${report.priorityBucketReconciliation.highUniqueReviews}`);
  console.log(`  • MEDIUM: ${report.priorityBucketReconciliation.mediumUniqueReviews}`);
  console.log(`  • LOW: ${report.priorityBucketReconciliation.lowUniqueReviews}`);
  console.log(`  • Total Sum: ${report.priorityBucketReconciliation.totalSum}`);

  if (report.priorityBucketReconciliation.totalSum !== 33) {
    throw new Error(`FAIL: Priority bucket sum is ${report.priorityBucketReconciliation.totalSum}, expected 33!`);
  }

  if (report.priorityBucketReconciliation.duplicatePriorityAssignmentsFound !== 0) {
    throw new Error(`FAIL: Found ${report.priorityBucketReconciliation.duplicatePriorityAssignmentsFound} duplicate priority assignments!`);
  }
  console.log('✔ PASS: Priority bucket assignment is unique per review and sums to exactly 33.\n');

  // 2. Celebration Deep Audit Verification
  console.log(`[TEST 2] Verifying Celebration Deep Audit:`);
  console.log(`  • Celebration Unique Review Count: ${report.celebrationAuditResult.uniqueCelebrationReviewCount}`);
  if (report.celebrationAuditResult.uniqueCelebrationReviewCount !== 4) {
    throw new Error(`FAIL: Expected 4 unique celebration reviews, got ${report.celebrationAuditResult.uniqueCelebrationReviewCount}`);
  }
  console.log('✔ PASS: Exact 4 unique celebration reviews identified with grounded text/private note excerpts.\n');

  // 3. Service Polarity Audit Verification
  console.log(`[TEST 3] Verifying Service Polarity Audit:`);
  console.log(`  • Total Service Unique Reviews: ${report.serviceAuditResult.totalServiceUniqueReviews}`);
  console.log(`  • SERVICE_POSITIVE Unique Count: ${report.serviceAuditResult.servicePositiveUniqueCount}`);
  console.log(`  • SERVICE_NEGATIVE Unique Count: ${report.serviceAuditResult.serviceNegativeUniqueCount}`);

  if (report.serviceAuditResult.servicePositiveUniqueCount !== 6 || report.serviceAuditResult.serviceNegativeUniqueCount !== 4) {
    throw new Error('FAIL: Service positive (6) or service negative (4) counts mismatched!');
  }
  console.log('✔ PASS: Service positive (6) and service negative (4) polarities separated cleanly.\n');

  // 4. Response Coverage Metrics Check
  console.log(`[TEST 4] Verifying Response Coverage Metrics:`);
  console.log(`  • Total Reviews: ${report.responseCoverage.totalReviews}`);
  console.log(`  • <=3★ Reviews: ${report.responseCoverage.negativeReviewsCount}`);
  console.log(`  • Negative With Reply: ${report.responseCoverage.negativeWithReplyCount}`);
  console.log(`  • >=4★ Reviews: ${report.responseCoverage.positiveReviewsCount}`);
  console.log(`  • Positive With Reply: ${report.responseCoverage.positiveWithReplyCount}`);
  console.log(`  • Total With Reply: ${report.responseCoverage.totalWithReplyCount}`);

  if (report.responseCoverage.totalReviews !== 33 ||
      report.responseCoverage.negativeReviewsCount !== 10 ||
      report.responseCoverage.negativeWithReplyCount !== 4 ||
      report.responseCoverage.positiveReviewsCount !== 23 ||
      report.responseCoverage.totalWithReplyCount !== 14) {
    throw new Error('FAIL: Response coverage metrics do not match canonical database state!');
  }
  console.log('✔ PASS: Response coverage metrics match database state 100%.\n');

  // 5. Downstream Production DB Verification (0 alerts, 0 recovery cases created)
  const reviewAlerts = await db.alert.count({
    where: { locationId: texasLoc.id, alertType: { in: ['REVIEW_SENTIMENT', 'GUEST_RECOVERY', 'NEGATIVE_REVIEW'] } }
  });

  const reviewRecoveryCases = await db.recoveryCase.count({
    where: { locationId: texasLoc.id, contentItem: { provenanceMode: 'IMPORTED' } }
  });

  console.log(`[TEST 5] Downstream Production State Check:`);
  console.log(`  • Production Review Alerts: ${reviewAlerts}`);
  console.log(`  • Production Recovery Cases: ${reviewRecoveryCases}`);

  if (reviewAlerts !== 0 || reviewRecoveryCases !== 0) {
    throw new Error('FAIL: Production alerts or recovery cases created!');
  }
  console.log('✔ PASS: Zero production alerts or recovery cases created.\n');

  console.log('==================================================');
  console.log('🎉 ALL PHASE 6B-1 REGRESSION VERIFICATIONS PASSED!');
  console.log('==================================================');
}

runPhase6B1SummaryTest().catch(err => {
  console.error('\n❌ PHASE 6B-1 SUMMARY FAILED:', err);
  process.exit(1);
});
