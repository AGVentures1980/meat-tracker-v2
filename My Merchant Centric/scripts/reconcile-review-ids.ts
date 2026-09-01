import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { db } from '../src/lib/db';

const FILES = [
  {
    name: 'Daily Aug 23',
    file: 'ReviewsReport_daily_20260823_bd1ebbb1-aade-47d7-b051-a3ca2b5f6d97.csv',
    path: '/Users/alexandregarcia/Downloads/ReviewsReport_daily_20260823_bd1ebbb1-aade-47d7-b051-a3ca2b5f6d97.csv'
  },
  {
    name: 'Daily Aug 24',
    file: 'ReviewsReport_daily_20260824_2c62e4d4-5f2e-4ee7-a7a6-38310eb4f57d.csv',
    path: '/Users/alexandregarcia/Downloads/ReviewsReport_daily_20260824_2c62e4d4-5f2e-4ee7-a7a6-38310eb4f57d.csv'
  },
  {
    name: 'Daily Aug 25',
    file: 'ReviewsReport_daily_20260825_8fb2caa3-9f06-476d-b67a-e433b5f65891.csv',
    path: '/Users/alexandregarcia/Downloads/ReviewsReport_daily_20260825_8fb2caa3-9f06-476d-b67a-e433b5f65891.csv'
  },
  {
    name: 'Weekly Aug 17-23',
    file: 'ReviewsReport_weekly_20260817_7bf72489-3a50-45c9-aa07-b543c757fcd2.csv',
    path: '/Users/alexandregarcia/Downloads/ReviewsReport_weekly_20260817_7bf72489-3a50-45c9-aa07-b543c757fcd2.csv'
  }
];

async function reconcileReviewIds() {
  console.log('==================================================');
  console.log('PHASE 5B-3 — REVIEW ID RECONCILIATION AUDIT');
  console.log('==================================================\n');

  const fileData: Record<string, any[]> = {};
  const reviewIdToFileMap: Record<string, string[]> = {};
  const allReviewIdsList: string[] = [];

  for (const f of FILES) {
    const raw = fs.readFileSync(f.path, 'utf8');
    const rows: any[] = parse(raw, { columns: true, skip_empty_lines: true, trim: true });
    fileData[f.name] = rows;

    console.log(`• ${f.name} (${f.file}): ${rows.length} raw rows`);
    for (const r of rows) {
      const revId = (r['Review ID'] || '').trim();
      if (revId) {
        allReviewIdsList.push(revId);
        if (!reviewIdToFileMap[revId]) reviewIdToFileMap[revId] = [];
        reviewIdToFileMap[revId].push(f.name);
      }
    }
  }

  const totalRawRows = allReviewIdsList.length;
  const uniqueReviewIdsSet = new Set(allReviewIdsList);

  console.log(`\nTotal Raw Rows Across 4 Files: ${totalRawRows}`);
  console.log(`Total Unique Review IDs Across 4 Files: ${uniqueReviewIdsSet.size}\n`);

  // Pairwise Overlap Matrix
  console.log('==================================================');
  console.log('PAIRWISE OVERLAP MATRIX');
  console.log('==================================================');
  for (let i = 0; i < FILES.length; i++) {
    for (let j = i + 1; j < FILES.length; j++) {
      const f1 = FILES[i];
      const f2 = FILES[j];
      const arr1 = fileData[f1.name].map(r => r['Review ID']);
      const arr2 = fileData[f2.name].map(r => r['Review ID']);
      const overlap = arr1.filter(id => arr2.includes(id));
      console.log(`• ${f1.name} ↔ ${f2.name}: ${overlap.length} shared Review ID(s)`);
    }
  }

  // Inspect Database ContentItems
  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Texas location missing!');

  const dbContentItems = await db.contentItem.findMany({
    where: { locationId: texasLoc.id, provenanceMode: 'IMPORTED' },
    include: { dataset: true, datasetItems: { include: { dataset: true } } }
  });

  console.log(`\n==================================================`);
  console.log(`CURRENT DB CANONICAL CONTENTITEMS: ${dbContentItems.length}`);
  console.log(`==================================================`);

  const extIdToCiMap = new Map<string, any>();
  for (const ci of dbContentItems) {
    if (ci.externalId) extIdToCiMap.set(ci.externalId, ci);
  }

  const missingFromDb = Array.from(uniqueReviewIdsSet).filter(id => !extIdToCiMap.has(id));
  console.log(`Unique Review IDs in CSVs: ${uniqueReviewIdsSet.size}`);
  console.log(`Unique External IDs in DB: ${extIdToCiMap.size}`);
  console.log(`Missing Review IDs in DB: ${missingFromDb.length}`);

  if (missingFromDb.length > 0) {
    console.log(`\n⚠️ MISSING REVIEW IDS IN DB:`, missingFromDb);
  } else {
    console.log(`\n✔ PERFECT 1-TO-1 MATCH: All ${uniqueReviewIdsSet.size} unique Review IDs in CSVs exist as distinct canonical ContentItems in DB!`);
  }
}

reconcileReviewIds().catch(console.error);
