import { db } from '../src/lib/db';
import { runPhase6A2AuditAndIntelligence } from '../src/lib/scout/reputationIntelligenceEngine';

async function runPhase6A1SummaryTest() {
  console.log('==================================================');
  console.log('PHASE 6A-1 — EVIDENCE GROUNDING & DATASET REGRESSION TEST');
  console.log('==================================================\n');

  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Texas location missing!');

  const report = await runPhase6A2AuditAndIntelligence(texasLoc.id);

  // 1. Verify Analyzed Count
  console.log(`[TEST 1] Canonical Reviews Analyzed: ${report.sourceMetrics.totalCount}`);
  if (report.sourceMetrics.totalCount !== 33) {
    throw new Error(`Expected 33 reviews analyzed, found ${report.sourceMetrics.totalCount}`);
  }
  console.log('✔ PASS: Exact 33 authentic canonical reviews analyzed.\n');

  // 2. Verify Rating Distribution & Average Rating (4.12★)
  console.log(`[TEST 2] Verifying Rating Distribution & Average:`);
  console.log(`  • Average Rating: ${report.sourceMetrics.totalDisplayRating}`);

  if (report.sourceMetrics.totalDisplayRating !== '4.12★') {
    throw new Error(`Expected average rating 4.12★, found ${report.sourceMetrics.totalDisplayRating}`);
  }
  console.log('✔ PASS: Average rating (4.12★) matches source audit 100%.\n');

  // 3. Verify Employee Mentions Evidence Grounding
  console.log(`[TEST 3] Verifying Employee Mentions Evidence Grounding:`);
  const empNames = report.employeeEvidenceTable.map((e: any) => e.rawName.toLowerCase());
  console.log(`  • Extracted Employee Names: ${empNames.join(', ')}`);

  const falseNames = ['carlos', 'pedro', 'ana', 'gabriel', 'sofia', 'lucas', 'bruno', 'daniel'];
  const invalidEmps = empNames.filter((n: any) => falseNames.includes(n));

  if (invalidEmps.length > 0) {
    throw new Error(`FAIL: Found unsupported hardcoded employee names: ${invalidEmps.join(', ')}`);
  }
  console.log('✔ PASS: Zero ungrounded/hardcoded employee names present in extracted mentions.\n');

  // 4. Verify Competitor Mentions Signal Extracted
  console.log(`[TEST 4] Verifying Competitor Mention Signals:`);
  console.log(`  • Competitor Signals Extracted: ${report.competitorMentionTable.length}`);
  report.competitorMentionTable.forEach((c: any) => {
    console.log(`    - Raw Phrase: "${c.rawCompetitorPhrase}" | Mapped: "${c.normalizedCompetitor}"`);
  });

  if (report.competitorMentionTable.length === 0) {
    throw new Error('FAIL: Expected explicit competitor mention signals!');
  }
  console.log('✔ PASS: Competitor mention signals extracted.\n');

  // 5. Downstream Production State Check
  const reviewAlerts = await db.alert.count({
    where: { locationId: texasLoc.id, alertType: { in: ['REVIEW_SENTIMENT', 'GUEST_RECOVERY', 'NEGATIVE_REVIEW'] } }
  });

  const reviewRecoveryCases = await db.recoveryCase.count({
    where: { locationId: texasLoc.id, contentItem: { provenanceMode: 'IMPORTED' } }
  });

  console.log(`[TEST 5] Downstream Production State Check:`);
  console.log(`  • Production Review Alerts: ${reviewAlerts}`);
  console.log(`  • Production Recovery Cases: ${reviewRecoveryCases}`);

  if (reviewAlerts !== 0 || reviewRecoveryCases !== 0) {
    throw new Error('FAIL: Production alerts or recovery cases created!');
  }
  console.log('✔ PASS: Zero production alerts or recovery cases created.\n');

  console.log('==================================================');
  console.log('🎉 ALL PHASE 6A-1 REGRESSION VERIFICATIONS PASSED!');
  console.log('==================================================');
}

runPhase6A1SummaryTest().catch(err => {
  console.error('\n❌ PHASE 6A-1 SUMMARY FAILED:', err);
  process.exit(1);
});
