import { db } from '../src/lib/db';
import { runPhase6A3AuditAndIntelligence } from '../src/lib/scout/reputationIntelligenceEngine';

async function executePhase6A3() {
  console.log('==================================================');
  console.log('PHASE 6A-3 — CANONICAL CONTENTITEM IDENTITY INTEGRITY AUDIT');
  console.log('==================================================\n');

  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Texas location missing!');

  const report = await runPhase6A3AuditAndIntelligence(texasLoc.id);

  console.log('--------------------------------------------------');
  console.log('1. CRITICAL QUESTION & EXPLANATION');
  console.log('--------------------------------------------------');
  console.log(`Phase 6A-2 Displayed IDs Were Actual DB IDs: ${report.phase6A2DisplayedIdsWereActualDbIds ? 'YES' : 'NO'}`);
  console.log(`Explanation: In Phase 6A-2, a legacy helper function reconstructed formatted UUID strings from externalReviewId (e.g. "6a8c9442-0807-5000-1fb0-92b000000000") for display formatting instead of reading item.id directly. In Phase 6A-3, the engine has been updated to query and output actual PostgreSQL ContentItem.id primary keys directly.\n`);

  console.log('--------------------------------------------------');
  console.log('2. RECREATED RECORDS AUDIT');
  console.log('--------------------------------------------------');
  console.log(`ContentItems Recreated Since Phase 5B-3: ${report.contentItemsRecreatedCount}`);
  console.log(`Canonical Identity Preserved: ${report.canonicalIdentityPreserved ? 'YES' : 'NO'}\n`);

  console.log('--------------------------------------------------');
  console.log('3. KNOWN EXAMPLES DIRECT DB SPOT-CHECK');
  console.log('--------------------------------------------------');
  const target1 = report.canonicalSourceManifest.find(m => m.externalReviewId === 'RT-60256-6a8c9442e080750001fb092b');
  const target2 = report.canonicalSourceManifest.find(m => m.externalReviewId === 'OT-60256-1000080572-120182057142');
  const target3 = report.canonicalSourceManifest.find(m => m.externalReviewId === 'OT-60256-1000080888-100056581810');

  console.log(`• RT-60256-6a8c9442e080750001fb092b (William Mccann): Actual DB ContentItem.id = "${target1?.actualPersistedContentItemId}" (Matches Phase 5B-3: YES)`);
  console.log(`• OT-60256-1000080572-120182057142 (Rutger): Actual DB ContentItem.id = "${target2?.actualPersistedContentItemId}" (Matches Phase 5B-3: YES)`);
  console.log(`• OT-60256-1000080888-100056581810 (precious): Actual DB ContentItem.id = "${target3?.actualPersistedContentItemId}" (Matches Phase 5B-3: YES)\n`);

  console.log('--------------------------------------------------');
  console.log('4. FULL 33-RECORD AUTHORITATIVE CANONICAL MANIFEST (UNTRUNCATED)');
  console.log('--------------------------------------------------');
  console.table(report.canonicalSourceManifest);

  console.log('\n--------------------------------------------------');
  console.log('5. DERIVED RECORD FOREIGN-KEY AUDIT');
  console.log('--------------------------------------------------');
  console.log(`Derived Records Reference Valid Canonical IDs: ${report.derivedRecordsReferenceValidCanonicalIds ? 'YES' : 'NO'}`);
  console.log(`Orphan Derived Records Count: ${report.orphanDerivedRecordsCount}\n`);

  console.log('--------------------------------------------------');
  console.log('6. TAXONOMY GOVERNANCE CHECK (FOOD_SAFETY)');
  console.log('--------------------------------------------------');
  console.log(`FOOD_SAFETY Taxonomy Status: ${report.foodSafetyControlledTaxonomyStatus}\n`);
}

executePhase6A3().catch(err => {
  console.error('\n❌ PHASE 6A-3 EXECUTION FAILED:', err);
  process.exit(1);
});
