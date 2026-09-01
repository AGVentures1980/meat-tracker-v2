import { db } from '../src/lib/db';
import { runPhase6A3AuditAndIntelligence } from '../src/lib/scout/reputationIntelligenceEngine';

async function runPhase6A3SummaryTest() {
  console.log('==================================================');
  console.log('PHASE 6A-3 — CANONICAL IDENTITY INTEGRITY REGRESSION TEST');
  console.log('==================================================\n');

  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Texas location missing!');

  const report = await runPhase6A3AuditAndIntelligence(texasLoc.id);

  // 1. Verify 33 Manifest Rows Returned Un-truncated
  console.log(`[TEST 1] Verifying Full 33-Record Manifest Return:`);
  console.log(`  • Manifest Rows Count: ${report.canonicalSourceManifest.length}`);
  if (report.canonicalSourceManifest.length !== 33) {
    throw new Error(`FAIL: Expected 33 manifest rows, got ${report.canonicalSourceManifest.length}`);
  }
  console.log('✔ PASS: Exact 33-record manifest returned without truncation.\n');

  // 2. Verify Known Examples Match Phase 5B-3 DB Primary Keys
  console.log(`[TEST 2] Verifying Known Examples Match Database Primary Keys:`);
  const t1 = report.canonicalSourceManifest.find(m => m.externalReviewId === 'RT-60256-6a8c9442e080750001fb092b');
  const t2 = report.canonicalSourceManifest.find(m => m.externalReviewId === 'OT-60256-1000080572-120182057142');
  const t3 = report.canonicalSourceManifest.find(m => m.externalReviewId === 'OT-60256-1000080888-100056581810');

  console.log(`  • William Mccann: ${t1?.actualPersistedContentItemId}`);
  console.log(`  • Rutger: ${t2?.actualPersistedContentItemId}`);
  console.log(`  • precious: ${t3?.actualPersistedContentItemId}`);

  if (t1?.actualPersistedContentItemId !== '2c3c9ac6-5504-4af0-84b6-8b96bb00fa03' ||
      t2?.actualPersistedContentItemId !== 'aaf74bda-b5d8-4492-a2bc-9bc2b17069cd' ||
      t3?.actualPersistedContentItemId !== 'f40df2cc-fdfd-419c-a982-5475ba972a12') {
    throw new Error('FAIL: Persisted ContentItem.id primary keys do not match Phase 5B-3 canonical database records!');
  }
  console.log('✔ PASS: All 3 known spot-check records match Phase 5B-3 database primary keys 100%.\n');

  // 3. Verify Foreign Key Audit & 0 Orphans
  console.log(`[TEST 3] Verifying Derived Record Foreign Key Audit:`);
  console.log(`  • Orphan Derived Records Count: ${report.orphanDerivedRecordsCount}`);
  if (report.orphanDerivedRecordsCount !== 0) {
    throw new Error(`FAIL: Found ${report.orphanDerivedRecordsCount} orphan derived records!`);
  }
  console.log('✔ PASS: Zero orphan derived records found.\n');

  // 4. Verify Controlled Taxonomy Governance
  console.log(`[TEST 4] Verifying Controlled Taxonomy Governance:`);
  console.log(`  • FOOD_SAFETY Status: ${report.foodSafetyControlledTaxonomyStatus}`);
  if (!report.foodSafetyControlledTaxonomyStatus.includes('OFFICIALLY_REGISTERED')) {
    throw new Error('FAIL: FOOD_SAFETY is not officially registered in controlled taxonomy!');
  }
  console.log('✔ PASS: FOOD_SAFETY officially registered in controlled taxonomy v2.1.\n');

  console.log('==================================================');
  console.log('🎉 ALL PHASE 6A-3 REGRESSION VERIFICATIONS PASSED!');
  console.log('==================================================');
}

runPhase6A3SummaryTest().catch(err => {
  console.error('\n❌ PHASE 6A-3 SUMMARY FAILED:', err);
  process.exit(1);
});
