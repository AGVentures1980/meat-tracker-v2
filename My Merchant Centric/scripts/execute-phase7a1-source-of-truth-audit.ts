import { runPhase7ANetworkRegistryAudit } from '../src/lib/scout/networkRegistryEngine';

async function executePhase7A1() {
  console.log('==================================================');
  console.log('PHASE 7A-1 — NETWORK REGISTRY SOURCE-OF-TRUTH AUDIT');
  console.log('==================================================\n');

  const report = await runPhase7ANetworkRegistryAudit();

  console.log('--------------------------------------------------');
  console.log('1. REBUILD DISCOVERY SUMMARY');
  console.log('--------------------------------------------------');
  console.log(`Old Phase 7A Active Location Count: ${report.summary.oldPhase7AActiveCount}`);
  console.log(`Official Directory Current Operating Count: ${report.summary.officialDirectoryCurrentOperatingCount}`);
  console.log(`US Territory Locations Count (San Juan, PR): ${report.summary.usTerritoryLocationsCount}`);
  console.log(`Coming Soon / Future Locations Count: ${report.summary.futureComingSoonLocationsCount}`);
  console.log(`International Locations Count: ${report.summary.internationalLocationsCount}`);
  console.log(`Missing Operational Locations Discovered: ${report.summary.missingOperationalLocationsDiscoveredCount}`);
  console.log(`False/Stale Phase 7A Active Records: ${report.summary.falseStalePhase7AActiveRecordsCount} (e.g. Concord, CA)`);
  console.log(`Phase 7A Place IDs Audited: ${report.summary.phase7APlaceIdsAuditedCount}`);
  console.log(`Authentic Place IDs Verified: ${report.summary.authenticPlaceIdsVerifiedCount} (Tampa: ChIJHdigC67DwogRkWjPRn8SUbQ)`);
  console.log(`Invalid/Synthetic Place IDs Discovered: ${report.summary.invalidSyntheticPlaceIdsDiscoveredCount} (Sanitised)`);
  console.log(`Unresolved Google Place IDs: ${report.summary.unresolvedGoogleIdsCount}`);
  console.log(`States Represented: ${report.summary.statesRepresentedCount} (${report.summary.statesList.join(', ')})`);
  console.log(`Geographic Markets Represented: ${report.summary.geographicMarketsRepresentedCount}\n`);

  console.log('--------------------------------------------------');
  console.log('2. TAMPA POC #1 IMMUTABILITY CHECK');
  console.log('--------------------------------------------------');
  console.log(`Tampa Location ID Unchanged: ${report.tampaRegression.tampaLocationIdUnchanged ? 'YES' : 'NO'}`);
  console.log(`Tampa Place ID Unchanged: ${report.tampaRegression.tampaPlaceIdUnchanged ? 'YES' : 'NO'}`);
  console.log(`Tampa 33 Authentic Reviews Preserved: ${report.tampaRegression.tampa33AuthenticReviewsPreserved ? 'YES' : 'NO'}`);
  console.log(`Tampa Approved Competitive Set Preserved: ${report.tampaRegression.tampaApprovedCompetitiveSetPreserved ? 'YES' : 'NO'}`);
  console.log(`Tampa Brand Pulse Remains Disabled: ${report.tampaRegression.tampaBrandPulseOfficiallyDisabled ? 'YES' : 'NO'}\n`);

  console.log('--------------------------------------------------');
  console.log('3. HARD INVARIANTS DECLARATION');
  console.log('--------------------------------------------------');
  console.log(`official directory parsed live: ${report.invariantsCheck.officialDirectoryParsedLive ? 'YES' : 'NO'}`);
  console.log(`complete current network discovered: ${report.invariantsCheck.completeCurrentNetworkDiscovered ? 'YES' : 'NO'}`);
  console.log(`Phase 7A synthetic/placeholder Place IDs found: ${report.invariantsCheck.phase7ASyntheticPlaceholderPlaceIdsFound}`);
  console.log(`all active Place IDs traceable to API responses: ${report.invariantsCheck.allActivePlaceIdsTraceableToApiResponses ? 'YES' : 'NO'}`);
  console.log(`stale/non-current stores classified correctly: ${report.invariantsCheck.staleNonCurrentStoresClassifiedCorrectly ? 'YES' : 'NO'}`);
  console.log(`future stores separated: ${report.invariantsCheck.futureStoresSeparated ? 'YES' : 'NO'}`);
  console.log(`Tampa unchanged: ${report.invariantsCheck.tampaUnchanged ? 'YES' : 'NO'}`);
  console.log(`competitors discovered: ${report.invariantsCheck.competitorsDiscovered ? 'YES (FAIL)' : 'NO (PASS)'}`);
  console.log(`Brand Pulse activated: ${report.invariantsCheck.brandPulseActivated ? 'YES (FAIL)' : 'NO (PASS)'}`);
  console.log(`localhost:3001 operational: ${report.invariantsCheck.localhost3001Operational ? 'YES' : 'NO'}`);
  console.log(`other local applications modified: ${report.invariantsCheck.otherLocalApplicationsModified ? 'YES (FAIL)' : 'NO (PASS)'}\n`);
}

executePhase7A1().catch(err => {
  console.error('\n❌ PHASE 7A-1 EXECUTION FAILED:', err);
  process.exit(1);
});
