import { db } from '../src/lib/db';

async function fixWilliamMccannRating() {
  console.log('==================================================');
  console.log('CORRECTING WILLIAM MCCANN RECORD IN DATABASE');
  console.log('==================================================\n');

  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Texas location missing!');

  const williamCi = await db.contentItem.findFirst({
    where: { locationId: texasLoc.id, externalId: 'RT-60256-6a8c9442e080750001fb092b' }
  });

  if (!williamCi) throw new Error('William Mccann ContentItem missing!');

  console.log(`Current DB State for William Mccann: Rating = ${williamCi.rating}★, Author = "${williamCi.authorName}"`);

  // Update rating to 2.0★ matching authentic CSV source
  await db.contentItem.update({
    where: { id: williamCi.id },
    data: {
      rating: 2.0,
      authorName: 'William Mccann'
    }
  });

  console.log('✔ Updated William Mccann rating to 2.0★ in database.\n');

  // Verify Source Metrics
  const googleItems = await db.contentItem.findMany({
    where: { locationId: texasLoc.id, provenanceMode: 'IMPORTED', rowSource: 'Google' }
  });

  const openTableItems = await db.contentItem.findMany({
    where: { locationId: texasLoc.id, provenanceMode: 'IMPORTED', rowSource: 'OpenTable' }
  });

  const googleSum = googleItems.reduce((acc, i) => acc + (i.rating || 0), 0);
  const openTableSum = openTableItems.reduce((acc, i) => acc + (i.rating || 0), 0);

  const googleAvg = (googleSum / googleItems.length).toFixed(4);
  const openTableAvg = (openTableSum / openTableItems.length).toFixed(4);
  const totalAvg = ((googleSum + openTableSum) / (googleItems.length + openTableItems.length)).toFixed(4);

  console.log('--------------------------------------------------');
  console.log('DATABASE RECONCILED METRICS AUDIT');
  console.log('--------------------------------------------------');
  console.log(`Google Count: ${googleItems.length} | Sum: ${googleSum} | Avg: ${googleAvg}★ (Display: ${(googleSum / googleItems.length).toFixed(2)}★)`);
  console.log(`OpenTable Count: ${openTableItems.length} | Sum: ${openTableSum} | Avg: ${openTableAvg}★ (Display: ${(openTableSum / openTableItems.length).toFixed(2)}★)`);
  console.log(`Total Count: ${googleItems.length + openTableItems.length} | Sum: ${googleSum + openTableSum} | Avg: ${totalAvg}★ (Display: ${((googleSum + openTableSum) / (googleItems.length + openTableItems.length)).toFixed(2)}★)`);
}

fixWilliamMccannRating().catch(console.error);
