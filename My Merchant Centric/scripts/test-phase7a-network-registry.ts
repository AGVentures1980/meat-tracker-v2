import { db } from '../src/lib/db';
import { runPhase7ANetworkRegistryAudit } from '../src/lib/scout/networkRegistryEngine';

async function runPhase7ATest() {
  console.log('==================================================');
  console.log('PHASE 7A — TEXAS DE BRAZIL NETWORK REGISTRY REGRESSION TEST');
  console.log('==================================================\n');

  const report = await runPhase7ANetworkRegistryAudit();

  // 1. Tampa Preservation Check
  console.log('[TEST 1] Verifying Tampa Location Preservation & Anchor Data:');
  console.log(`  • Tampa Location ID Unchanged: ${report.tampaRegression.tampaLocationIdUnchanged ? 'YES' : 'NO'}`);
  console.log(`  • Tampa Place ID Unchanged: ${report.tampaRegression.tampaPlaceIdUnchanged ? 'YES' : 'NO'}`);
  console.log(`  • Tampa 33 Authentic Reviews Preserved: ${report.tampaRegression.tampa33AuthenticReviewsPreserved ? 'YES' : 'NO'}`);

  if (!report.tampaRegression.tampaLocationIdUnchanged ||
      !report.tampaRegression.tampaPlaceIdUnchanged ||
      !report.tampaRegression.tampa33AuthenticReviewsPreserved) {
    throw new Error('FAIL: Canonical Tampa location data violated!');
  }
  console.log('✔ PASS: Canonical Tampa location preserved with 33 authentic reviews intact.\n');

  // 2. Real Location Registry Verification
  console.log('[TEST 2] Verifying Discovered Real Network Locations:');
  console.log(`  • Total Discovered Locations: ${report.summary.totalDiscoveredLocations}`);
  console.log(`  • Operational Locations: ${report.summary.verifiedOperationalLocationsCount}`);
  console.log(`  • States Represented: ${report.summary.statesRepresentedCount}`);
  console.log(`  • Markets Represented: ${report.summary.geographicMarketsRepresentedCount}`);

  if (report.summary.totalDiscoveredLocations < 25) {
    throw new Error(`FAIL: Found only ${report.summary.totalDiscoveredLocations} locations, expected at least 25 real stores!`);
  }
  console.log('✔ PASS: Authoritative real network registry established across US states.\n');

  // 3. Metadata vs Review Text Separation Verification
  console.log('[TEST 3] Verifying Metadata vs Review Text Separation for New Stores:');
  const nonTampaWithReviews = await db.contentItem.count({
    where: {
      location: { name: { startsWith: 'Texas de Brazil', not: 'Texas de Brazil - Tampa' } }
    }
  });

  console.log(`  • Non-Tampa Review ContentItems: ${nonTampaWithReviews}`);
  if (nonTampaWithReviews !== 0) {
    throw new Error(`FAIL: Found ${nonTampaWithReviews} fabricated review ContentItems for new locations!`);
  }
  console.log('✔ PASS: Zero review text created for additional locations (Metadata-Only enforced).\n');

  // 4. Competitor Set Separation Verification
  console.log('[TEST 4] Verifying Competitive Set Separation (Phase 7B Not Started):');
  const nonTampaCompSets = await db.competitiveSet.count({
    where: {
      location: { name: { startsWith: 'Texas de Brazil', not: 'Texas de Brazil - Tampa' } }
    }
  });

  console.log(`  • Non-Tampa Competitive Sets Created: ${nonTampaCompSets}`);
  if (nonTampaCompSets !== 0) {
    throw new Error(`FAIL: Found ${nonTampaCompSets} competitive sets automatically created for new locations!`);
  }
  console.log('✔ PASS: Zero competitive sets automatically created for new locations.\n');

  console.log('==================================================');
  console.log('🎉 ALL PHASE 7A REGRESSION VERIFICATIONS PASSED!');
  console.log('==================================================');
}

runPhase7ATest().catch(err => {
  console.error('\n❌ PHASE 7A TEST FAILED:', err);
  process.exit(1);
});
