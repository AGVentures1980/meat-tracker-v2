import { db } from '../src/lib/db';
import { runPhase6A2AuditAndIntelligence } from '../src/lib/scout/reputationIntelligenceEngine';

async function executePhase6A2() {
  console.log('==================================================');
  console.log('PHASE 6A-2 — RECORD LINKAGE & EVIDENCE INVARIANT AUDIT');
  console.log('==================================================\n');

  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Texas location missing!');

  const report = await runPhase6A2AuditAndIntelligence(texasLoc.id);

  console.log('--------------------------------------------------');
  console.log('A. SOURCE METRIC RECONCILIATION');
  console.log('--------------------------------------------------');
  console.log(`Google: Count = ${report.sourceMetrics.googleCount} | Sum = ${report.sourceMetrics.googleRatingSum} | Avg = ${report.sourceMetrics.googleAvgRating} (${report.sourceMetrics.googleDisplayRating})`);
  console.log(`  • Text-Bearing: ${report.sourceMetrics.googleTextBearingCount} | Rating-Only: ${report.sourceMetrics.googleRatingOnlyCount}`);
  console.log(`OpenTable: Count = ${report.sourceMetrics.openTableCount} | Sum = ${report.sourceMetrics.openTableRatingSum} | Avg = ${report.sourceMetrics.openTableAvgRating} (${report.sourceMetrics.openTableDisplayRating})`);
  console.log(`  • Text-Bearing: ${report.sourceMetrics.openTableTextBearingCount} | Rating-Only: ${report.sourceMetrics.openTableRatingOnlyCount}`);
  console.log(`Total: Count = ${report.sourceMetrics.totalCount} | Sum = ${report.sourceMetrics.totalRatingSum} | Avg = ${report.sourceMetrics.totalAvgRating} (${report.sourceMetrics.totalDisplayRating})`);
  console.log(`  • Total Text-Bearing: ${report.sourceMetrics.totalTextBearingCount} | Total Rating-Only: ${report.sourceMetrics.totalRatingOnlyCount}\n`);

  console.log('--------------------------------------------------');
  console.log('B. 33-RECORD CANONICAL SOURCE MANIFEST');
  console.log('--------------------------------------------------');
  console.table(report.canonicalSourceManifest);

  console.log('\n--------------------------------------------------');
  console.log('C. 15 TEXT-BEARING REVIEW SENTIMENT TABLE');
  console.log('--------------------------------------------------');
  console.table(report.sentimentValidationTable);

  console.log('\n--------------------------------------------------');
  console.log('D. EMPLOYEE EVIDENCE TABLE (ENTITY TYPES & SUBSTRING INVARIANT)');
  console.log('--------------------------------------------------');
  console.table(report.employeeEvidenceTable);

  console.log('\n--------------------------------------------------');
  console.log('E. MENU EVIDENCE TABLE (SUBSTRING INVARIANT ENFORCED)');
  console.log('--------------------------------------------------');
  console.table(report.menuEvidenceTable);

  console.log('\n--------------------------------------------------');
  console.log('F. TOPIC + TOPIC-SENTIMENT TABLE (MULTI-TOPIC POLARITY)');
  console.log('--------------------------------------------------');
  console.table(report.topicEvidenceTable);

  console.log('\n--------------------------------------------------');
  console.log('G. COMPETITOR MENTION TABLE WITH EVIDENCE CHANNEL');
  console.log('--------------------------------------------------');
  console.table(report.competitorMentionTable);

  console.log('\n--------------------------------------------------');
  console.log('H. ADVISORY ATTENTION SIGNALS TABLE (0 PRODUCTION ALERTS CREATED)');
  console.log('--------------------------------------------------');
  console.table(report.potentialAttentionSignals);

  console.log('\n--------------------------------------------------');
  console.log('SYSTEM INTEGRITY & INVARIANT SUMMARY');
  console.log('--------------------------------------------------');
  console.log(`William Mccann source record matches CSV: ${report.williamMccannRecordCorrect ? 'YES' : 'NO'}`);
  console.log(`Ungrounded Darvi complaint exists in authentic corpus: ${report.ungroundedDarviComplaintExistsInCorpus ? 'YES' : 'NO'}`);
  console.log(`Evidence substring invariant enforced: ${report.evidenceSubstringInvariantEnforced ? 'YES' : 'NO'}`);
  console.log(`Private-note / Public-review separation enforced: ${report.privateNotePublicSeparationEnforced ? 'YES' : 'NO'}`);
  console.log(`Ambiguous Rodizio incorrectly mapped to Rodizio Grill: ${report.ambiguousRodizioMappedToRodizioGrill ? 'YES' : 'NO'}`);
  console.log(`Terra Gaucha private-note signal preserved correctly: ${report.terraGauchaPrivateNotePreserved ? 'YES' : 'NO'}\n`);
}

executePhase6A2().catch(err => {
  console.error('\n❌ PHASE 6A-2 EXECUTION FAILED:', err);
  process.exit(1);
});
