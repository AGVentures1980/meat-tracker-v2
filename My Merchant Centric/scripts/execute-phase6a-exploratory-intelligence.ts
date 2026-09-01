import { db } from '../src/lib/db';
import { runPhase6A2AuditAndIntelligence } from '../src/lib/scout/reputationIntelligenceEngine';

async function executePhase6A() {
  console.log('==================================================');
  console.log('PHASE 6A — EXPLORATORY AI REPUTATION INTELLIGENCE ON AUTHENTIC DATASET');
  console.log('==================================================\n');

  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Texas location missing!');

  console.log('Running exploratory intelligence engine...');
  const report = await runPhase6A2AuditAndIntelligence(texasLoc.id);

  console.log('\n==================================================');
  console.log('PHASE 6A EXPLORATORY INTELLIGENCE REPORT');
  console.log('==================================================');
  console.log(`Canonical Reviews Analyzed: ${report.sourceMetrics.totalCount}`);
  console.log(`  • Reviews with Text: ${report.sourceMetrics.totalTextBearingCount}`);
  console.log(`  • Rating-Only Reviews (Blank Text): ${report.sourceMetrics.totalRatingOnlyCount}`);
  console.log(`Average Rating in Imported Dataset: ${report.sourceMetrics.totalDisplayRating}`);

  console.log('\nSource Breakdown:');
  console.log(`  • Google: ${report.sourceMetrics.googleCount} reviews | Avg: ${report.sourceMetrics.googleDisplayRating} | Text Available: ${report.sourceMetrics.googleTextBearingCount}`);
  console.log(`  • OpenTable: ${report.sourceMetrics.openTableCount} reviews | Avg: ${report.sourceMetrics.openTableDisplayRating} | Text Available: ${report.sourceMetrics.openTableTextBearingCount}`);

  console.log('\nTopic Evidence List:');
  console.table(report.topicEvidenceTable);

  console.log('Menu Mentions (Explicitly Named):');
  console.table(report.menuEvidenceTable);

  console.log('Employee Mentions (Explicitly Named):');
  console.table(report.employeeEvidenceTable);

  console.log('Competitor Mentions Signal:');
  console.table(report.competitorMentionTable);

  console.log('Advisory Potential Attention Signals (No Production Alerts):');
  console.table(report.potentialAttentionSignals);

  console.log('\nEngine Metadata:');
  console.log(`  • Engine: ${report.engineProviderVersion}\n`);
}

executePhase6A().catch(err => {
  console.error('\n❌ PHASE 6A FAILED:', err);
  process.exit(1);
});
