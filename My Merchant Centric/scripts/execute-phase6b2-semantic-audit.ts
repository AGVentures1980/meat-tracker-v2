import { db } from '../src/lib/db';
import { runPhase6BOperationalIntelligence } from '../src/lib/scout/operationalIntelligenceEngine';

async function executePhase6B2() {
  console.log('==================================================');
  console.log('PHASE 6B-2 — EXECUTIVE SUMMARY SEMANTIC CONSISTENCY PATCH');
  console.log('==================================================\n');

  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Texas location missing!');

  const report = await runPhase6BOperationalIntelligence(texasLoc.id);

  console.log('--------------------------------------------------');
  console.log('1. TAMPA POC MILESTONE STATUS');
  console.log('--------------------------------------------------');
  console.log(`Status: ${report.tampaPocStatus}`);
  console.log(`Disclosure: "${report.disclosureNotice}"`);
  console.log(`Official Brand Pulse Status: ${report.officialBrandPulseStatus}\n`);

  console.log('--------------------------------------------------');
  console.log('2. SUMMARY CLAIM COUNT INVARIANT AUDIT');
  console.log('--------------------------------------------------');
  console.log(`Summary claims with count mismatch: ${report.invariantsCheck.summaryClaimsWithCountMismatch}`);
  console.log(`Summary claims without evidence: ${report.invariantsCheck.summaryClaimsWithoutEvidence}\n`);

  console.log('--------------------------------------------------');
  console.log('3. EMPLOYEE RECOGNITION AUDIT');
  console.log('--------------------------------------------------');
  console.log(`Explicit Named Employee Review Count: ${report.employeeRecognitionAuditResult.explicitNamedEmployeeReviewCount} (${report.employeeRecognitionAuditResult.explicitEmployeeReviewIds.join(', ')})`);
  console.log(`General Positive Service Review Count: ${report.employeeRecognitionAuditResult.generalPositiveServiceReviewCount}\n`);

  console.log('--------------------------------------------------');
  console.log('4. CELEBRATION SEMANTICS BREAKDOWN');
  console.log('--------------------------------------------------');
  console.log(`Total Celebration Mention Count: ${report.celebrationAuditResult.uniqueCelebrationReviewCount}`);
  console.log(`  • Positive Celebration Experiences: ${report.celebrationAuditResult.positiveCelebrationCount}`);
  console.log(`  • Mixed Celebration Experiences: ${report.celebrationAuditResult.mixedCelebrationCount}`);
  console.log(`  • Negative/Churn Celebration Experiences: ${report.celebrationAuditResult.negativeCelebrationCount}\n`);

  console.log('--------------------------------------------------');
  console.log('5. FOOD ITEMS UNBUNDLED AUDIT');
  console.log('--------------------------------------------------');
  console.log(`Salad Bar Unique Review Count: ${report.foodItemsAuditResult.saladBarUniqueReviewCount} (${report.foodItemsAuditResult.saladBarReviewIds.join(', ')})`);
  console.log(`Lobster Bisque Unique Review Count: ${report.foodItemsAuditResult.lobsterBisqueUniqueReviewCount} (${report.foodItemsAuditResult.lobsterBisqueReviewIds.join(', ')})`);
  console.log(`Hot Sides Unique Review Count: ${report.foodItemsAuditResult.hotSidesUniqueReviewCount} (${report.foodItemsAuditResult.hotSidesReviewIds.join(', ')})\n`);

  console.log('--------------------------------------------------');
  console.log('6. COMPETITOR SIGNAL CLASSIFICATION');
  console.log('--------------------------------------------------');
  console.log(`Terra Gaucha Classified as Churn: ${report.invariantsCheck.terraGauchaClassifiedAsChurn ? 'YES' : 'NO'}`);
  console.log(`Rodizio Classified as Confirmed Churn: ${report.invariantsCheck.rodizioClassifiedAsConfirmedChurn ? 'YES (FAIL)' : 'NO (AMBIGUOUS - PASS)'}\n`);

  console.log('--------------------------------------------------');
  console.log('7. REVISED EXECUTIVE MANAGEMENT SUMMARY (FACT-GROUNDED & INVARIANT ENFORCED)');
  console.log('--------------------------------------------------');
  console.log('WHAT\'S WORKING:');
  report.executiveSummary.whatsWorking.forEach(w => console.log(`  • ${w}`));

  console.log('\nWHAT NEEDS ATTENTION:');
  report.executiveSummary.whatsNeedingAttention.forEach(a => console.log(`  • ${a}`));

  console.log('\nIMMEDIATE RISK:');
  report.executiveSummary.immediateRisk.forEach(r => console.log(`  • ${r}`));

  console.log('\nGUEST RECOVERY OPPORTUNITIES:');
  report.executiveSummary.guestRecoveryOpportunities.forEach(g => console.log(`  • ${g}`));

  console.log('\nCOMPETITIVE SIGNALS:');
  report.executiveSummary.competitiveSignals.forEach(c => console.log(`  • ${c}`));

  console.log('\nEMPLOYEE RECOGNITION:');
  report.executiveSummary.employeeRecognition.forEach(e => console.log(`  • ${e}`));

  console.log('\n--------------------------------------------------');
  console.log('8. FINAL TAMPA POC MILESTONE REPORT');
  console.log('--------------------------------------------------');
  console.log(`Management/Service polarity separation verified: ${report.invariantsCheck.managementServicePolaritySeparationVerified ? 'YES' : 'NO'}`);
  console.log(`Official Brand Pulse activated: ${report.invariantsCheck.officialBrandPulseActivated ? 'YES' : 'NO'}`);
  console.log(`Canonical records modified: ${report.invariantsCheck.canonicalRecordsModified ? 'YES' : 'NO'}`);
  console.log(`localhost:3001 operational: ${report.invariantsCheck.localhost3001Operational ? 'YES' : 'NO'}\n`);
}

executePhase6B2().catch(err => {
  console.error('\n❌ PHASE 6B-2 EXECUTION FAILED:', err);
  process.exit(1);
});
