import { db } from '../src/lib/db';

async function runPhase5B2SummaryTest() {
  console.log('==================================================');
  console.log('PHASE 5B-2 — MULTI-REPORT PROVENANCE RECONCILIATION TEST');
  console.log('==================================================\n');

  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Texas location missing!');

  // 1. Total Canonical Review ContentItems
  const canonicalReviews = await db.contentItem.findMany({
    where: { locationId: texasLoc.id, provenanceMode: 'IMPORTED' },
    include: { datasetItems: true, dataset: true, sentimentAnalysis: true }
  });

  console.log(`[TEST 1] Canonical Authentic ContentItem Records in DB: ${canonicalReviews.length}`);
  if (canonicalReviews.length !== 31) {
    throw new Error(`Expected 31 canonical review records, found ${canonicalReviews.length}`);
  }
  console.log('✔ PASS: Canonical review count matches exact unique records without duplicate creation.\n');

  // 2. Check Activation Status (Quarantine State)
  const pendingCount = canonicalReviews.filter(r => r.activationStatus === 'IMPORTED_PENDING_VALIDATION').length;
  console.log(`[TEST 2] Reviews in Quarantine State (IMPORTED_PENDING_VALIDATION): ${pendingCount}`);
  if (pendingCount !== 31) {
    throw new Error(`Expected all 31 reviews in IMPORTED_PENDING_VALIDATION, found ${pendingCount}`);
  }
  console.log('✔ PASS: All 31 canonical reviews remain quarantined pending human operator approval.\n');

  // 3. Cross-Dataset Linkage Demonstration (Aug 23 Daily vs Weekly Report)
  const multiLinkedReview = canonicalReviews.find(r => r.datasetItems.length === 2);
  console.log(`[TEST 3] Demonstrating Cross-Dataset Overlap Linkage:`);
  if (!multiLinkedReview) {
    throw new Error('FAIL: Multi-dataset join link missing!');
  }
  console.log(`  • Review ID: "${multiLinkedReview.externalId}"`);
  console.log(`  • Canonical ContentItem ID: ${multiLinkedReview.id}`);
  console.log(`  • Linked ReviewDataset Count: ${multiLinkedReview.datasetItems.length}`);
  console.log('✔ PASS: Cross-dataset join links correctly map 1 canonical ContentItem to 2 dataset receipts.\n');

  // 4. Downstream AI & Alert State Verification
  const reviewAlerts = await db.alert.count({
    where: { locationId: texasLoc.id, alertType: { in: ['REVIEW_SENTIMENT', 'GUEST_RECOVERY', 'NEGATIVE_REVIEW'] } }
  });

  const reviewRecoveryCases = await db.recoveryCase.count({
    where: { locationId: texasLoc.id, contentItem: { provenanceMode: 'IMPORTED' } }
  });

  console.log(`[TEST 4] Downstream AI & Alert Verification:`);
  console.log(`  • Review AI Alerts: ${reviewAlerts}`);
  console.log(`  • Review Recovery Cases: ${reviewRecoveryCases}`);

  if (reviewAlerts !== 0 || reviewRecoveryCases !== 0) {
    throw new Error('FAIL: Premature AI alerts or recovery cases created for review content!');
  }
  console.log('✔ PASS: Zero AI alerts or recovery cases created.\n');

  console.log('==================================================');
  console.log('🎉 ALL PHASE 5B-2 VERIFICATIONS PASSED!');
  console.log('==================================================');
}

runPhase5B2SummaryTest().catch((err: any) => {
  console.error('\n❌ PHASE 5B-2 SUMMARY FAILED:', err);
  process.exit(1);
});
