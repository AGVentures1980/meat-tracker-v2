import { runPhase7ANetworkRegistryAudit } from '../src/lib/scout/networkRegistryEngine';

async function executePhase7A() {
  console.log('==================================================');
  console.log('PHASE 7A — TEXAS DE BRAZIL NETWORK REGISTRY AUDIT');
  console.log('==================================================\n');

  const report = await runPhase7ANetworkRegistryAudit();

  console.log('--------------------------------------------------');
  console.log('1. NETWORK REGISTRY DISCOVERY SUMMARY');
  console.log('--------------------------------------------------');
  console.log(`Total Discovered Texas de Brazil Locations: ${report.summary.totalDiscoveredLocations}`);
  console.log(`Verified Operational Locations: ${report.summary.verifiedOperationalLocationsCount}`);
  console.log(`Temporarily Closed Locations: ${report.summary.temporarilyClosedLocationsCount}`);
  console.log(`Permanently Closed Locations: ${report.summary.permanentlyClosedLocationsCount}`);
  console.log(`Unverified Locations: ${report.summary.unverifiedLocationsCount}`);
  console.log(`Locations With Google Place ID: ${report.summary.locationsWithGooglePlaceIdCount}`);
  console.log(`Locations Without Google Place ID: ${report.summary.locationsWithoutGooglePlaceIdCount}`);
  console.log(`Duplicate Candidates Rejected: ${report.summary.duplicateCandidatesRejectedCount}`);
  console.log(`Location Identity Conflicts: ${report.summary.locationIdentityConflictsCount}`);
  console.log(`States Represented: ${report.summary.statesRepresentedCount} (${report.summary.statesList.join(', ')})`);
  console.log(`Geographic Markets Represented: ${report.summary.geographicMarketsRepresentedCount} (${report.summary.geographicMarketsList.slice(0, 8).join(', ')}...)\n`);

  console.log('--------------------------------------------------');
  console.log('2. TAMPA REGRESSION CHECK');
  console.log('--------------------------------------------------');
  console.log(`Tampa Location ID Unchanged: ${report.tampaRegression.tampaLocationIdUnchanged ? 'YES' : 'NO'}`);
  console.log(`Tampa Place ID Unchanged: ${report.tampaRegression.tampaPlaceIdUnchanged ? 'YES' : 'NO'}`);
  console.log(`Tampa 33 Authentic Reviews Preserved: ${report.tampaRegression.tampa33AuthenticReviewsPreserved ? 'YES' : 'NO'}`);
  console.log(`Tampa Analytics Preserved: ${report.tampaRegression.tampaAnalyticsPreserved ? 'YES' : 'NO'}`);
  console.log(`Tampa Approved Competitive Set Preserved: ${report.tampaRegression.tampaApprovedCompetitiveSetPreserved ? 'YES' : 'NO'}`);
  console.log(`Tampa Brand Pulse Remains Officially Disabled: ${report.tampaRegression.tampaBrandPulseOfficiallyDisabled ? 'YES' : 'NO'}\n`);

  console.log('--------------------------------------------------');
  console.log('3. FULL LOCATION MANIFEST (29 STORES)');
  console.log('--------------------------------------------------');
  console.table(report.fullLocationManifest.map(l => ({
    name: l.canonicalName,
    city: l.city,
    state: l.state,
    address: l.address,
    googlePlaceId: l.googlePlaceId,
    businessStatus: l.businessStatus,
    market: l.geographicMarket,
    verification: l.verificationStatus,
    compSetStatus: l.competitiveSetStatus,
    reviewIntelligence: l.reviewIntelligenceStatus
  })));

  console.log('\n--------------------------------------------------');
  console.log('4. FINAL INTEGRITY DECLARATIONS');
  console.log('--------------------------------------------------');
  console.log(`real Texas de Brazil network registry implemented: ${report.invariantsCheck.realTexasDeBrazilNetworkRegistryImplemented ? 'YES' : 'NO'}`);
  console.log(`synthetic locations created: ${report.invariantsCheck.syntheticLocationsCreated ? 'YES (FAIL)' : 'NO (PASS)'}`);
  console.log(`Tampa duplicated: ${report.invariantsCheck.tampaDuplicated ? 'YES (FAIL)' : 'NO (PASS)'}`);
  console.log(`all verified locations evidence-backed: ${report.invariantsCheck.allVerifiedLocationsEvidenceBacked ? 'YES' : 'NO'}`);
  console.log(`Google Place IDs verified rather than guessed: ${report.invariantsCheck.googlePlaceIdsVerifiedRatherThanGuessed ? 'YES' : 'NO'}`);
  console.log(`location provenance stored: ${report.invariantsCheck.locationProvenanceStored ? 'YES' : 'NO'}`);
  console.log(`metadata-only correctly separated from review content: ${report.invariantsCheck.metadataOnlyCorrectlySeparatedFromReviewContent ? 'YES' : 'NO'}`);
  console.log(`competitors automatically created: ${report.invariantsCheck.competitorsAutomaticallyCreated ? 'YES (FAIL)' : 'NO (PASS)'}`);
  console.log(`additional review text fabricated: ${report.invariantsCheck.additionalReviewTextFabricated ? 'YES (FAIL)' : 'NO (PASS)'}`);
  console.log(`Brand Pulse activated for new locations: ${report.invariantsCheck.brandPulseActivatedForNewLocations ? 'YES (FAIL)' : 'NO (PASS)'}`);
  console.log(`localhost:3001 operational: ${report.invariantsCheck.localhost3001Operational ? 'YES' : 'NO'}`);
  console.log(`other local applications modified: ${report.invariantsCheck.otherLocalApplicationsModified ? 'YES (FAIL)' : 'NO (PASS)'}\n`);
}

executePhase7A().catch(err => {
  console.error('\n❌ PHASE 7A EXECUTION FAILED:', err);
  process.exit(1);
});
