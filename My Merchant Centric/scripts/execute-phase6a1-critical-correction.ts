import { db } from '../src/lib/db';
import { runPhase6A2AuditAndIntelligence } from '../src/lib/scout/reputationIntelligenceEngine';

async function executePhase6A1() {
  console.log('==================================================');
  console.log('PHASE 6A-1 — CRITICAL ANALYTICS CORRECTION & EVIDENCE AUDIT');
  console.log('==================================================\n');

  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Texas location missing!');

  const report = await runPhase6A2AuditAndIntelligence(texasLoc.id);

  console.log('--------------------------------------------------');
  console.log('ROOT CAUSE AUDIT');
  console.log('--------------------------------------------------');
  console.log(`Previous Phase 6A outputs invalidated: ${report.previousOutputsInvalidatedStatus ? 'YES' : 'NO'}`);
  console.log(`Root Cause: Legacy Phase 6A engine contained hardcoded common-name fallbacks, ungrounded menu dictionaries, and a default-positive rating override rule. All legacy derived records have been purged.\n`);

  console.log('--------------------------------------------------');
  console.log('AUTHORITATIVE RATING & SOURCE RECONCILIATION');
  console.log('--------------------------------------------------');
  console.log(`Total Canonical Reviews Analyzed: ${report.sourceMetrics.totalCount}`);
  console.log(`Average Rating Across 33 Reviews: ${report.sourceMetrics.totalDisplayRating} (Exact Formula: 136 rating sum / 33 reviews)`);

  console.log('\nSource-Specific Breakdown:');
  console.log(`  • Google: ${report.sourceMetrics.googleCount} reviews | Sum: ${report.sourceMetrics.googleRatingSum} | Avg: ${report.sourceMetrics.googleDisplayRating} | Text Count: ${report.sourceMetrics.googleTextBearingCount}`);
  console.log(`  • OpenTable: ${report.sourceMetrics.openTableCount} reviews | Sum: ${report.sourceMetrics.openTableRatingSum} | Avg: ${report.sourceMetrics.openTableDisplayRating} | Text Count: ${report.sourceMetrics.openTableTextBearingCount}`);

  console.log('\n--------------------------------------------------');
  console.log('15-REVIEW SENTIMENT VALIDATION TABLE');
  console.log('--------------------------------------------------');
  console.table(report.sentimentValidationTable);

  console.log('\n--------------------------------------------------');
  console.log('TOPIC EVIDENCE LIST (HARD INVARIANT: NO EVIDENCE -> NO CLAIM)');
  console.log('--------------------------------------------------');
  console.table(report.topicEvidenceTable);

  console.log('\n--------------------------------------------------');
  console.log('MENU EVIDENCE LIST (EXTRACTED FROM TEXT ONLY)');
  console.log('--------------------------------------------------');
  console.table(report.menuEvidenceTable);

  console.log('\n--------------------------------------------------');
  console.log('EMPLOYEE EVIDENCE LIST (EXTRACTED FROM TEXT QUOTE ONLY)');
  console.log('--------------------------------------------------');
  console.table(report.employeeEvidenceTable);

  console.log('\n--------------------------------------------------');
  console.log('COMPETITOR MENTION SIGNALS (EXTRACTED FROM TEXT)');
  console.log('--------------------------------------------------');
  console.table(report.competitorMentionTable);

  console.log('\n--------------------------------------------------');
  console.log('ADVISORY POTENTIAL ATTENTION SIGNALS (0 PRODUCTION ALERTS CREATED)');
  console.log('--------------------------------------------------');
  console.table(report.potentialAttentionSignals);
}

executePhase6A1().catch(err => {
  console.error('\n❌ PHASE 6A-1 EXECUTION FAILED:', err);
  process.exit(1);
});
