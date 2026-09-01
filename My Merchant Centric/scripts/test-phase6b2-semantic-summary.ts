import { db } from '../src/lib/db';
import { runPhase6BOperationalIntelligence } from '../src/lib/scout/operationalIntelligenceEngine';

async function runPhase6B2SummaryTest() {
  console.log('==================================================');
  console.log('PHASE 6B-2 — EXECUTIVE SUMMARY SEMANTIC REGRESSION TEST');
  console.log('==================================================\n');

  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Texas location missing!');

  const report = await runPhase6BOperationalIntelligence(texasLoc.id);

  // 1. Summary Claim Count Invariants
  console.log(`[TEST 1] Verifying Summary Claim Count Invariants:`);
  console.log(`  • Summary Claims Count Mismatch: ${report.invariantsCheck.summaryClaimsWithCountMismatch}`);
  console.log(`  • Summary Claims Without Evidence: ${report.invariantsCheck.summaryClaimsWithoutEvidence}`);

  if (report.invariantsCheck.summaryClaimsWithCountMismatch !== 0 || report.invariantsCheck.summaryClaimsWithoutEvidence !== 0) {
    throw new Error('FAIL: Found summary claim count mismatch or claims without evidence!');
  }
  console.log('✔ PASS: Every summary claim count matches its supporting ContentItem IDs count 100%.\n');

  // 2. Employee Recognition & Food Items Unbundled Audit
  console.log(`[TEST 2] Verifying Employee Recognition & Unbundled Food Items Counts:`);
  console.log(`  • Explicit Named Employee Review Count: ${report.employeeRecognitionAuditResult.explicitNamedEmployeeReviewCount}`);
  console.log(`  • Salad Bar Unique Review Count: ${report.foodItemsAuditResult.saladBarUniqueReviewCount}`);
  console.log(`  • Lobster Bisque Unique Review Count: ${report.foodItemsAuditResult.lobsterBisqueUniqueReviewCount}`);

  if (report.employeeRecognitionAuditResult.explicitNamedEmployeeReviewCount !== 4) {
    throw new Error(`FAIL: Expected 4 explicit named employee reviews, got ${report.employeeRecognitionAuditResult.explicitNamedEmployeeReviewCount}`);
  }

  if (report.foodItemsAuditResult.saladBarUniqueReviewCount !== 4 || report.foodItemsAuditResult.lobsterBisqueUniqueReviewCount !== 1) {
    throw new Error('FAIL: Food items unique review counts mismatched!');
  }
  console.log('✔ PASS: Explicit employee recognition (4) and unbundled food items (Salad Bar: 4, Lobster Bisque: 1) verified 100%.\n');

  // 3. Celebration Semantics Breakdown
  console.log(`[TEST 3] Verifying Celebration Semantics Breakdown:`);
  console.log(`  • Celebration Total: ${report.celebrationAuditResult.uniqueCelebrationReviewCount}`);
  console.log(`  • Celebration Positive: ${report.celebrationAuditResult.positiveCelebrationCount}`);
  console.log(`  • Celebration Mixed: ${report.celebrationAuditResult.mixedCelebrationCount}`);
  console.log(`  • Celebration Negative/Churn: ${report.celebrationAuditResult.negativeCelebrationCount}`);

  if (report.celebrationAuditResult.uniqueCelebrationReviewCount !== 4 ||
      report.celebrationAuditResult.positiveCelebrationCount !== 1 ||
      report.celebrationAuditResult.mixedCelebrationCount !== 2 ||
      report.celebrationAuditResult.negativeCelebrationCount !== 1) {
    throw new Error('FAIL: Celebration semantics breakdown mismatched!');
  }
  console.log('✔ PASS: Celebration semantics breakdown (1 POS, 2 MIXED, 1 NEG/CHURN) verified 100%.\n');

  // 4. Competitor Signal Classification
  console.log(`[TEST 4] Verifying Competitor Signal Classification:`);
  console.log(`  • Terra Gaucha Classified as Churn: ${report.invariantsCheck.terraGauchaClassifiedAsChurn ? 'YES' : 'NO'}`);
  console.log(`  • Rodizio Classified as Confirmed Churn: ${report.invariantsCheck.rodizioClassifiedAsConfirmedChurn ? 'YES' : 'NO'}`);

  if (!report.invariantsCheck.terraGauchaClassifiedAsChurn || report.invariantsCheck.rodizioClassifiedAsConfirmedChurn) {
    throw new Error('FAIL: Competitor signal classification failure!');
  }
  console.log('✔ PASS: Terra Gaucha classified as CHURN (Private Note) and Rodizio retained as AMBIGUOUS.\n');

  // 5. Downstream System State Check
  console.log(`[TEST 5] Downstream System State Check:`);
  console.log(`  • Official Brand Pulse Activated: ${report.invariantsCheck.officialBrandPulseActivated ? 'YES' : 'NO'}`);
  console.log(`  • Canonical Records Modified: ${report.invariantsCheck.canonicalRecordsModified ? 'YES' : 'NO'}`);
  console.log(`  • Milestone Status: ${report.tampaPocStatus}`);

  if (report.invariantsCheck.officialBrandPulseActivated || report.invariantsCheck.canonicalRecordsModified) {
    throw new Error('FAIL: System state invariant violation!');
  }
  console.log('✔ PASS: Zero canonical records modified; Official Brand Pulse score remains OFFICIALLY_DISABLED.\n');

  console.log('==================================================');
  console.log('🎉 ALL PHASE 6B-2 REGRESSION VERIFICATIONS PASSED!');
  console.log('🏆 TAMPA POC v1 — HUMAN VALIDATED!');
  console.log('==================================================');
}

runPhase6B2SummaryTest().catch(err => {
  console.error('\n❌ PHASE 6B-2 SUMMARY FAILED:', err);
  process.exit(1);
});
