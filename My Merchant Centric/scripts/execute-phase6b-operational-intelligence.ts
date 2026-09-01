import { db } from '../src/lib/db';
import { runPhase6BOperationalIntelligence } from '../src/lib/scout/operationalIntelligenceEngine';

async function executePhase6B() {
  console.log('==================================================');
  console.log('PHASE 6B — OPERATIONAL REPUTATION INTELLIGENCE');
  console.log('==================================================\n');

  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Texas location missing!');

  const report = await runPhase6BOperationalIntelligence(texasLoc.id);

  console.log('--------------------------------------------------');
  console.log('1. DISCLOSURE & DATASET SCOPE');
  console.log('--------------------------------------------------');
  console.log(`Notice: "${report.disclosureNotice}"`);
  console.log(`Reviews Analyzed: ${report.reviewsAnalyzedCount}`);
  console.log(`Imported Dataset Avg Rating: ${report.importedDatasetAvgRating}`);
  console.log(`Official Brand Pulse Status: ${report.officialBrandPulseStatus}\n`);

  console.log('--------------------------------------------------');
  console.log('2. OPERATIONAL ISSUE TAXONOMY COUNTS');
  console.log('--------------------------------------------------');
  console.table(report.operationalIssueCounts);

  console.log('\n--------------------------------------------------');
  console.log('3. ATTENTION PRIORITY COUNTS');
  console.log('--------------------------------------------------');
  console.table(report.attentionSignals);

  console.log('\n--------------------------------------------------');
  console.log('4. RECURRING VS ISOLATED ISSUES (RECURRING REQUIRES >= 2 RECORDS)');
  console.log('--------------------------------------------------');
  console.table(report.recurringIssues);

  console.log('\n--------------------------------------------------');
  console.log('5. GUEST RECOVERY CANDIDATES (0 PRODUCTION CASES CREATED)');
  console.log('--------------------------------------------------');
  console.table(report.guestRecoveryCandidates);

  console.log('\n--------------------------------------------------');
  console.log('6. POSITIVE EMPLOYEE RECOGNITION STREAM');
  console.log('--------------------------------------------------');
  console.table(report.employeeRecognitions);

  console.log('\n--------------------------------------------------');
  console.log('7. COMPETITOR CHURN INTELLIGENCE (PRIVATE NOTE SEPARATED)');
  console.log('--------------------------------------------------');
  console.table(report.competitorChurnSignals);

  console.log('\n--------------------------------------------------');
  console.log('8. RESPONSE COVERAGE METRICS');
  console.log('--------------------------------------------------');
  console.table(report.responseCoverage);

  console.log('\n--------------------------------------------------');
  console.log('9. EXECUTIVE MANAGEMENT SUMMARY');
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
  console.log('10. SYSTEM INVARIANTS CHECK');
  console.log('--------------------------------------------------');
  console.log(`Every Operational Issue Evidence-Backed: ${report.invariantsCheck.everyOperationalIssueEvidenceBacked ? 'YES' : 'NO'}`);
  console.log(`Recurring Issue Requires >= 2 Records: ${report.invariantsCheck.recurringIssueRequiresMin2Records ? 'YES' : 'NO'}`);
  console.log(`Private-Note Evidence Kept Separate: ${report.invariantsCheck.privateNoteEvidenceKeptSeparate ? 'YES' : 'NO'}`);
  console.log(`Ambiguous Competitors Left Unresolved: ${report.invariantsCheck.ambiguousCompetitorsLeftUnresolved ? 'YES' : 'NO'}`);
  console.log(`Guest Recovery Production Cases Created: ${report.invariantsCheck.guestRecoveryProductionCasesCreated ? 'YES' : 'NO'}`);
  console.log(`Production Alerts Created: ${report.invariantsCheck.productionAlertsCreated ? 'YES' : 'NO'}`);
  console.log(`Official Brand Pulse Activated: ${report.invariantsCheck.officialBrandPulseActivated ? 'YES' : 'NO'}`);
  console.log(`DEMO Data Used: ${report.invariantsCheck.demoDataUsed ? 'YES' : 'NO'}`);
  console.log(`Orphan Derived Records Count: ${report.invariantsCheck.orphanDerivedRecordsCount}\n`);
}

executePhase6B().catch(err => {
  console.error('\n❌ PHASE 6B EXECUTION FAILED:', err);
  process.exit(1);
});
