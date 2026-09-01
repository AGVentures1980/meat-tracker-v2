import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { db } from '../src/lib/db';

const CSV_FILES = [
  { name: 'Daily Aug 23', path: '/Users/alexandregarcia/Downloads/ReviewsReport_daily_20260823_bd1ebbb1-aade-47d7-b051-a3ca2b5f6d97.csv' },
  { name: 'Daily Aug 24', path: '/Users/alexandregarcia/Downloads/ReviewsReport_daily_20260824_2c62e4d4-5f2e-4ee7-a7a6-38310eb4f57d.csv' },
  { name: 'Daily Aug 25', path: '/Users/alexandregarcia/Downloads/ReviewsReport_daily_20260825_8fb2caa3-9f06-476d-b67a-e433b5f65891.csv' },
  { name: 'Weekly Aug 17-23', path: '/Users/alexandregarcia/Downloads/ReviewsReport_weekly_20260817_7bf72489-3a50-45c9-aa07-b543c757fcd2.csv' }
];

async function auditCanonicalCorpus() {
  console.log('==================================================');
  console.log('PHASE 6A-1 — CANONICAL REVIEW CORPUS AUDIT');
  console.log('==================================================\n');

  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Texas location missing!');

  const items = await db.contentItem.findMany({
    where: { locationId: texasLoc.id, provenanceMode: 'IMPORTED' },
    orderBy: [{ rating: 'asc' }, { publishedAt: 'desc' }]
  });

  console.log(`Total Canonical ContentItems in DB: ${items.length}\n`);

  // Rating breakdown check
  const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let ratingSum = 0;

  const googleItems: any[] = [];
  const openTableItems: any[] = [];

  const textBearingItems: any[] = [];
  const blankTextItems: any[] = [];

  items.forEach((item, idx) => {
    const r = Math.round(item.rating || 5);
    ratingDist[r] = (ratingDist[r] || 0) + 1;
    ratingSum += (item.rating || 0);

    if (item.rowSource === 'Google') googleItems.push(item);
    else openTableItems.push(item);

    const txt = (item.text || '').trim();
    if (txt) textBearingItems.push(item);
    else blankTextItems.push(item);
  });

  const avgRating = (ratingSum / items.length).toFixed(6);

  console.log('--------------------------------------------------');
  console.log('DB RATING DISTRIBUTION & AVERAGE AUDIT');
  console.log('--------------------------------------------------');
  console.log(`5★: ${ratingDist[5]}`);
  console.log(`4★: ${ratingDist[4]}`);
  console.log(`3★: ${ratingDist[3]}`);
  console.log(`2★: ${ratingDist[2]}`);
  console.log(`1★: ${ratingDist[1]}`);
  console.log(`Total Rating Sum: ${ratingSum}`);
  console.log(`Calculated Average Rating: ${avgRating}★ (Formatted: ${(ratingSum / items.length).toFixed(2)}★)`);

  console.log('\n--------------------------------------------------');
  console.log('SOURCE BREAKDOWN AUDIT');
  console.log('--------------------------------------------------');
  const googleSum = googleItems.reduce((acc, i) => acc + (i.rating || 0), 0);
  const openTableSum = openTableItems.reduce((acc, i) => acc + (i.rating || 0), 0);

  const googleAvg = googleItems.length > 0 ? (googleSum / googleItems.length).toFixed(4) : '0';
  const openTableAvg = openTableItems.length > 0 ? (openTableSum / openTableItems.length).toFixed(4) : '0';

  console.log(`Google Count: ${googleItems.length} | Sum: ${googleSum} | Avg: ${googleAvg}★ (${(googleSum / googleItems.length).toFixed(2)}★)`);
  console.log(`OpenTable Count: ${openTableItems.length} | Sum: ${openTableSum} | Avg: ${openTableAvg}★ (${(openTableSum / openTableItems.length).toFixed(2)}★)`);

  console.log('\n--------------------------------------------------');
  console.log(`TEXT-BEARING REVIEWS AUDIT (${textBearingItems.length} REVIEWS WITH TEXT)`);
  console.log('--------------------------------------------------');
  textBearingItems.forEach((item, idx) => {
    console.log(`\n[#${idx + 1}] Review ID: ${item.externalId} | Source: ${item.rowSource} | Rating: ${item.rating}★ | Author: "${item.authorName}"`);
    console.log(`    Text: "${item.text}"`);
  });

  console.log('\n--------------------------------------------------');
  console.log(`RATING-ONLY REVIEWS AUDIT (${blankTextItems.length} BLANK-TEXT REVIEWS)`);
  console.log('--------------------------------------------------');
  blankTextItems.forEach((item, idx) => {
    console.log(`[#${idx + 1}] Review ID: ${item.externalId} | Source: ${item.rowSource} | Rating: ${item.rating}★ | Author: "${item.authorName}"`);
  });
}

auditCanonicalCorpus().catch(console.error);
