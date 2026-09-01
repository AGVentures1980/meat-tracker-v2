import { db } from '../src/lib/db';
import { processLocationReviewsAI, analyzeReviewTextWithAI } from '../src/lib/scout/aiIntelligenceEngine';

async function runPhase6AITest() {
  console.log('==================================================');
  console.log('STARTING PHASE 6 — AI REPUTATION INTELLIGENCE TEST');
  console.log('==================================================\n');

  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Texas de Brazil Tampa location missing');

  const processedCount = await processLocationReviewsAI(texasLoc.id);
  console.log(`Processed ${processedCount} ContentItem(s) with AI Reputation Intelligence Engine.`);

  const items = await db.contentItem.findMany({
    where: { locationId: texasLoc.id, provenanceMode: { in: ['LIVE', 'IMPORTED'] } },
    include: { sentimentAnalysis: true }
  });

  console.log('\n--- AI ANALYSIS & EVIDENCE LINKAGE RESULTS ---');
  items.forEach((item, idx) => {
    const ai = analyzeReviewTextWithAI(item.text, item.rating);
    console.log(`\nReview ${idx + 1} [ID: ${item.id.substring(0, 8)}...]`);
    console.log(`  - Text Snippet: "${item.text.substring(0, 70)}..."`);
    console.log(`  - Overall Sentiment: ${ai.sentiment} (Confidence: ${ai.confidence})`);
    console.log(`  - Topics Detected: ${ai.topics.map(t => t.topicId).join(', ')}`);
    console.log(`  - Menu Items Detected: ${ai.menuMentions.map(m => m.menuItemName).join(', ') || 'None'}`);
    console.log(`  - Named Employee Mentions: ${ai.employeeMentions.map(e => `${e.employeeName} (${e.sentiment})`).join(', ') || 'None'}`);
    console.log(`  - Recovery Signal: ${ai.recoverySignal ? `YES (Severity: ${ai.recoverySeverity})` : 'NO'}`);
  });

  console.log('\n==================================================');
  console.log('🎉 PHASE 6 AI REPUTATION INTELLIGENCE TEST PASSED!');
  console.log('==================================================');
}

runPhase6AITest().catch(err => {
  console.error('\n❌ PHASE 6 TEST FAILED:', err);
  process.exit(1);
});
