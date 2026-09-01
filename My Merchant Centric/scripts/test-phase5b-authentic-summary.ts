import { db } from '../src/lib/db';

async function verifyPhase5BState() {
  console.log('==================================================');
  console.log('PHASE 5B — AUTHENTIC DATASET VERIFICATION');
  console.log('==================================================\n');

  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Texas location missing');

  // Count real imported reviews for Texas de Brazil Tampa
  const importedReviews = await db.contentItem.findMany({
    where: { locationId: texasLoc.id, provenanceMode: 'IMPORTED' },
    include: { dataset: true, sentimentAnalysis: true }
  });

  console.log(`[1] Real Review Text Count for Texas de Brazil Tampa: ${importedReviews.length}`);
  if (importedReviews.length !== 1) {
    throw new Error(`Expected exactly 1 real review record, found ${importedReviews.length}`);
  }

  const review = importedReviews[0];
  console.log(`    • ContentItem ID: ${review.id}`);
  console.log(`    • External Review ID: ${review.externalId}`);
  console.log(`    • Report Provider: ${review.dataset?.provider} (${review.dataset?.reportChannel})`);
  console.log(`    • Row Review Source: ${review.rowSource}`);
  console.log(`    • Author Name: ${review.authorName}`);
  console.log(`    • Rating: ${review.rating}★`);
  console.log(`    • Has Separate Restaurant Reply: ${!!review.restaurantReply}`);
  console.log(`    • Activation Status: ${review.activationStatus}`);
  console.log(`    • Sentiment Analysis Executed: ${review.sentimentAnalysis ? 'YES' : 'NO'}`);

  if (review.sentimentAnalysis) {
    throw new Error('FAIL: AI sentiment analysis was executed prematurely!');
  }

  // Count Review-Triggered Alerts & Recovery Cases
  const reviewAlertCount = await db.alert.count({
    where: { locationId: texasLoc.id, alertType: { in: ['REVIEW_SENTIMENT', 'GUEST_RECOVERY', 'NEGATIVE_REVIEW'] } }
  });

  const reviewCaseCount = await db.recoveryCase.count({
    where: { locationId: texasLoc.id, contentItemId: review.id }
  });

  console.log(`\n[2] Review-Triggered AI & Alert State:`);
  console.log(`    • Review AI Alerts Created: ${reviewAlertCount}`);
  console.log(`    • Review Guest Recovery Cases Created: ${reviewCaseCount}`);

  if (reviewAlertCount !== 0 || reviewCaseCount !== 0) {
    throw new Error('FAIL: Review-triggered AI alerts or recovery cases were created prematurely!');
  }

  console.log('\n==================================================');
  console.log('🎉 ALL PHASE 5B VERIFICATIONS PASSED!');
  console.log('==================================================');
}

verifyPhase5BState().catch(err => {
  console.error('\n❌ PHASE 5B VERIFICATION FAILED:', err);
  process.exit(1);
});
