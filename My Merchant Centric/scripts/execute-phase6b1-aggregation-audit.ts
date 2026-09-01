import { db } from '../src/lib/db';
import { runPhase6BOperationalIntelligence } from '../src/lib/scout/operationalIntelligenceEngine';

async function executePhase6B1() {
  console.log('==================================================');
  console.log('PHASE 6B-1 — OPERATIONAL AGGREGATION & SUMMARY CONSISTENCY AUDIT');
  console.log('==================================================\n');

  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Texas location missing!');

  const report = await runPhase6BOperationalIntelligence(texasLoc.id);

  console.log('--------------------------------------------------');
  console.log('1. OPERATIONAL ISSUE AGGREGATION TABLE (UNIQUE REVIEW COUNTS)');
  console.log('--------------------------------------------------');
  console.table(report.operationalAggregationTable);

  console.log('\n--------------------------------------------------');
  console.log('2. CELEBRATION AUDIT RESULT');
  console.log('--------------------------------------------------');
  console.log(`Unique Celebration Reviews Count: ${report.celebrationAuditResult.uniqueCelebrationReviewCount}`);
  console.log(`Review IDs: ${report.celebrationAuditResult.celebrationReviewIds.join(', ')}`);
  console.log('Excerpts:');
  report.celebrationAuditResult.evidenceExcerpts.forEach(e => console.log(`  • ${e}`));

  console.log('\n--------------------------------------------------');
  console.log('3. SERVICE POLARITY AUDIT RESULT');
  console.log('--------------------------------------------------');
  console.log(`Total Service Unique Reviews: ${report.serviceAuditResult.totalServiceUniqueReviews}`);
  console.log(`SERVICE_POSITIVE Unique Count: ${report.serviceAuditResult.servicePositiveUniqueCount} (${report.serviceAuditResult.servicePositiveReviewIds.join(', ')})`);
  console.log(`SERVICE_NEGATIVE Unique Count: ${report.serviceAuditResult.serviceNegativeUniqueCount} (${report.serviceAuditResult.serviceNegativeReviewIds.join(', ')})`);

  console.log('\n--------------------------------------------------');
  console.log('4. PRIORITY BUCKET RECONCILIATION');
  console.log('--------------------------------------------------');
  console.log(`CRITICAL Unique Reviews: ${report.priorityBucketReconciliation.criticalUniqueReviews} (${report.priorityBucketReconciliation.bucketDetails.critical.join(', ')})`);
  console.log(`HIGH Unique Reviews: ${report.priorityBucketReconciliation.highUniqueReviews} (${report.priorityBucketReconciliation.bucketDetails.high.join(', ')})`);
  console.log(`MEDIUM Unique Reviews: ${report.priorityBucketReconciliation.mediumUniqueReviews} (${report.priorityBucketReconciliation.bucketDetails.medium.join(', ')})`);
  console.log(`LOW Unique Reviews: ${report.priorityBucketReconciliation.lowUniqueReviews}`);
  console.log(`Total Priority Sum: ${report.priorityBucketReconciliation.totalSum} (Matches 33: ${report.priorityBucketReconciliation.totalSum === 33 ? 'YES' : 'NO'})`);
  console.log(`Duplicate Priority Assignments Found: ${report.priorityBucketReconciliation.duplicatePriorityAssignmentsFound}`);

  console.log('\n--------------------------------------------------');
  console.log('5. RESPONSE COVERAGE METRICS (CANONICAL RECONCILIATION)');
  console.log('--------------------------------------------------');
  console.table(report.responseCoverage);

  console.log('\n--------------------------------------------------');
  console.log('6. REVISED EXECUTIVE MANAGEMENT SUMMARY (FACTUAL AGGREGATION)');
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
  console.log('7. FINAL INTEGRITY DECLARATIONS');
  console.log('--------------------------------------------------');
  console.log(`Operational counts based on unique ContentItems: ${report.invariantsCheck.operationalCountsBasedOnUniqueContentItems ? 'YES' : 'NO'}`);
  console.log(`Mention count separated from review count: ${report.invariantsCheck.mentionCountSeparatedFromReviewCount ? 'YES' : 'NO'}`);
  console.log(`Every recurring issue supported by >=2 unique reviews: ${report.invariantsCheck.everyRecurringIssueSupportedByMin2Reviews ? 'YES' : 'NO'}`);
  console.log(`Review appearing in multiple priority buckets count: ${report.invariantsCheck.reviewAppearingInMultiplePriorityBucketsCount}`);
  console.log(`Rating-only reviews correctly identified: ${report.invariantsCheck.ratingOnlyReviewsCorrectlyIdentified ? 'YES' : 'NO'}`);
  console.log(`Priority totals sum to 33: ${report.invariantsCheck.priorityTotalsSumTo33 ? 'YES' : 'NO'}`);
  console.log(`Response coverage matches canonical data: ${report.invariantsCheck.responseCoverageMatchesCanonicalData ? 'YES' : 'NO'}`);
  console.log(`Unsupported management summary claims count: ${report.invariantsCheck.unsupportedManagementSummaryClaimsCount}`);
  console.log(`Brand Pulse activated: ${report.invariantsCheck.officialBrandPulseActivated ? 'YES' : 'NO'}`);
  console.log(`Production Alerts created: ${report.invariantsCheck.productionAlertsCreated ? 'YES' : 'NO'}`);
  console.log(`Production RecoveryCases created: ${report.invariantsCheck.productionRecoveryCasesCreated ? 'YES' : 'NO'}`);
  console.log(`DEMO records used: ${report.invariantsCheck.demoRecordsUsed ? 'YES' : 'NO'}`);
  console.log(`Orphan derived records count: ${report.invariantsCheck.orphanDerivedRecordsCount}`);
  console.log(`localhost:3001 operational: ${report.invariantsCheck.localhost3001Operational ? 'YES' : 'NO'}\n`);
}

executePhase6B1().catch(err => {
  console.error('\n❌ PHASE 6B-1 EXECUTION FAILED:', err);
  process.exit(1);
});
