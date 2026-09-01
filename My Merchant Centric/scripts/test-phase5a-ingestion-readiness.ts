import { db } from '../src/lib/db';
import { validateAndDeduplicateReviews } from '../src/lib/scout/reviewDeduplicationEngine';
import { evaluateReviewAnalyticsEligibility } from '../src/lib/scout/evaluateReviewAnalyticsEligibility';

async function runPhase5ATest() {
  console.log('==================================================');
  console.log('PHASE 5A — REAL REVIEW INGESTION READINESS TEST');
  console.log('==================================================\n');

  // 1. Check Real Review Text Count for Texas de Brazil Tampa
  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Texas de Brazil location missing');

  const beforeTextCount = await db.contentItem.count({
    where: { locationId: texasLoc.id, provenanceMode: { in: ['LIVE', 'IMPORTED'] } }
  });

  console.log(`[TEST 1] Texas de Brazil Tampa Real Review Text Count Before: ${beforeTextCount}`);
  if (beforeTextCount !== 0) {
    throw new Error(`FAIL: Expected 0 real review text records, found ${beforeTextCount}`);
  }
  console.log('✔ PASS: Real review text count before execution = 0.\n');

  // 2. Test Analytics Eligibility Logic (evaluateReviewAnalyticsEligibility)
  console.log('[TEST 2] Testing Dataset Analytics Eligibility Evaluator:');
  
  const metadataOnlyEval = evaluateReviewAnalyticsEligibility({
    coverageType: 'METADATA_ONLY',
    acquisitionMethod: 'PUBLIC_METADATA',
    provenanceMode: 'LIVE',
    importedRecordCount: 0,
    dataQualityStatus: 'HIGH',
    hasTextContent: false
  });

  if (metadataOnlyEval.brandPulseEligible || metadataOnlyEval.textSentimentEligible) {
    throw new Error('FAIL: METADATA_ONLY coverage allowed textual AI eligibility!');
  }
  console.log('  • METADATA_ONLY: Textual AI & Brand Pulse blocked correctly.');

  const sampleEval = evaluateReviewAnalyticsEligibility({
    coverageType: 'SAMPLE',
    acquisitionMethod: 'CLIENT_IMPORT',
    provenanceMode: 'IMPORTED',
    importedRecordCount: 15,
    dataQualityStatus: 'HIGH',
    hasTextContent: true
  });

  if (!sampleEval.browseEligible || sampleEval.brandPulseEligible) {
    throw new Error('FAIL: SAMPLE coverage did not permit browsing or failed to block Brand Pulse!');
  }
  console.log('  • SAMPLE coverage: Browsing allowed, population-level Brand Pulse blocked.');

  const partialEval = evaluateReviewAnalyticsEligibility({
    coverageType: 'PARTIAL',
    acquisitionMethod: 'CLIENT_IMPORT',
    provenanceMode: 'IMPORTED',
    importedRecordCount: 30,
    dataQualityStatus: 'HIGH',
    hasTextContent: true
  });

  if (!partialEval.brandPulseEligible) {
    throw new Error('FAIL: Valid PARTIAL dataset was erroneously blocked!');
  }
  console.log('  • PARTIAL coverage (30 records, HIGH quality): Eligible for Brand Pulse.');
  console.log('✔ PASS: Analytics eligibility rules working as designed.\n');

  // 3. Test Deduplication Engine
  console.log('[TEST 3] Testing Deduplication & Validation Engine:');
  const sampleRows = [
    { externalReviewId: 'rev-001', reviewText: 'Great churrasco!', rating: 5.0, authorName: 'Alice' },
    { externalReviewId: 'rev-001', reviewText: 'Great churrasco!', rating: 5.0, authorName: 'Alice' }, // Duplicate ID
    { externalReviewId: 'rev-002', reviewText: '   ', rating: 4.0, authorName: 'Bob' }, // Blank text
    { externalReviewId: 'rev-003', reviewText: 'Bad service', rating: 9.0, authorName: 'Charlie' } // Invalid rating
  ];

  const dedupRes = validateAndDeduplicateReviews(sampleRows);
  console.log(`  • Processed: ${dedupRes.totalRowsProcessed}`);
  console.log(`  • Accepted: ${dedupRes.accepted.length}`);
  console.log(`  • Duplicates Filtered: ${dedupRes.duplicateCount}`);
  console.log(`  • Rejected Rows: ${dedupRes.rejectedCount}`);

  if (dedupRes.accepted.length !== 1 || dedupRes.duplicateCount !== 1 || dedupRes.rejectedCount !== 2) {
    throw new Error('FAIL: Deduplication engine counts mismatch!');
  }
  console.log('✔ PASS: Multi-pass deduplication & validation passed cleanly.\n');

  // 4. Verify Real Review Text Count After Test Execution remains 0
  const afterTextCount = await db.contentItem.count({
    where: { locationId: texasLoc.id, provenanceMode: { in: ['LIVE', 'IMPORTED'] } }
  });

  console.log(`[TEST 4] Texas de Brazil Tampa Real Review Text Count After: ${afterTextCount}`);
  if (afterTextCount !== 0) {
    throw new Error(`FAIL: Expected 0 real review text records after readiness test, found ${afterTextCount}`);
  }
  console.log('✔ PASS: Real review text count after execution = 0.\n');

  console.log('==================================================');
  console.log('🎉 ALL PHASE 5A INGESTION READINESS TESTS PASSED!');
  console.log('==================================================');
}

runPhase5ATest().catch(err => {
  console.error('\n❌ PHASE 5A TEST FAILED:', err);
  process.exit(1);
});
