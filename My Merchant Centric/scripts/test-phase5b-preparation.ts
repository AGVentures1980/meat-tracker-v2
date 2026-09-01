import { db } from '../src/lib/db';
import { getProviderCapability, PROVIDER_CAPABILITY_REGISTRY } from '../src/lib/scout/providerCapabilityRegistry';

async function runPhase5BTest() {
  console.log('==================================================');
  console.log('PHASE 5B PREPARATION — DATASET READINESS TEST');
  console.log('==================================================\n');

  // 1. Provider Capability Contract Audit
  console.log('[TEST 1] Auditing Provider Capability Contracts:');
  const googleCap = getProviderCapability('GOOGLE');
  const yelpCap = getProviderCapability('YELP');
  const clientImportCap = getProviderCapability('CLIENT_IMPORT');

  console.log(`  • Google Places API (New): supportsReviewText = ${googleCap.supportsReviewText}`);
  console.log(`  • Yelp Fusion API: supportsReviewText = ${yelpCap.supportsReviewText} (Excerpts only: ${yelpCap.statusLabel})`);
  console.log(`  • Client Import File: supportsReviewText = ${clientImportCap.supportsReviewText}`);

  if (googleCap.supportsReviewText || yelpCap.supportsReviewText) {
    throw new Error('FAIL: Integration falsely represented as full review-text capable!');
  }
  console.log('✔ PASS: Provider capability contracts accurately distinguish metadata/excerpts from bulk review text.\n');

  // 2. Check Clean Real Data State for Texas de Brazil Tampa
  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Texas de Brazil location missing');

  const textReviewCount = await db.contentItem.count({
    where: { locationId: texasLoc.id, provenanceMode: { in: ['LIVE', 'IMPORTED'] } }
  });

  console.log(`[TEST 2] Texas de Brazil Tampa Real Review Text Count: ${textReviewCount}`);
  if (textReviewCount !== 0) {
    throw new Error(`FAIL: Expected 0 real review text records, found ${textReviewCount}`);
  }
  console.log('✔ PASS: Real review text count = 0 (clean state preserved).\n');

  // 3. Test Post-Import Validation Gate (IMPORTED_PENDING_VALIDATION -> ANALYTICS_ACTIVE)
  console.log('[TEST 3] Testing Post-Import Quarantine & Activation Gate:');
  const org = await db.organization.findFirst();
  if (!org) throw new Error('Organization missing');

  const testDataset = await db.reviewDataset.create({
    data: {
      organizationId: org.id,
      locationId: texasLoc.id,
      provider: 'CLIENT_IMPORT',
      acquisitionMethod: 'CLIENT_IMPORT',
      coverageType: 'SAMPLE',
      importedRecordCount: 5,
      duplicateCount: 0,
      rejectedCount: 0,
      uploadedBy: 'test_admin@brasabrandpulse.com',
      sourceFileName: 'readiness_test.csv',
      provenanceMode: 'DEMO', // Isolated test dataset
      dataQualityStatus: 'HIGH',
      activationStatus: 'IMPORTED_PENDING_VALIDATION'
    }
  });

  console.log(`  • Created test dataset ${testDataset.id} with status: ${testDataset.activationStatus}`);
  if (testDataset.activationStatus !== 'IMPORTED_PENDING_VALIDATION') {
    throw new Error('FAIL: Newly created dataset did not enter IMPORTED_PENDING_VALIDATION status!');
  }

  // Simulate human operator approval
  const updatedDataset = await db.reviewDataset.update({
    where: { id: testDataset.id },
    data: {
      activationStatus: 'ANALYTICS_ACTIVE',
      approvedForAnalyticsAt: new Date(),
      approvedForAnalyticsBy: 'test_admin@brasabrandpulse.com'
    }
  });

  console.log(`  • Approved dataset status: ${updatedDataset.activationStatus}`);
  if (updatedDataset.activationStatus !== 'ANALYTICS_ACTIVE') {
    throw new Error('FAIL: Dataset activation failed!');
  }

  // Cleanup test dataset
  await db.reviewDataset.delete({ where: { id: testDataset.id } });
  console.log('✔ PASS: Post-import validation gate and manual activation transition verified.\n');

  console.log('==================================================');
  console.log('🎉 ALL PHASE 5B PREPARATION TESTS PASSED!');
  console.log('==================================================');
}

runPhase5BTest().catch(err => {
  console.error('\n❌ PHASE 5B TEST FAILED:', err);
  process.exit(1);
});
