import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { parse } from 'csv-parse/sync';
import { db } from '../src/lib/db';
import { detectOpenTableCsvSchema } from '../src/lib/scout/openTablePipelineAdapter';
import { computeReviewContentHash } from '../src/lib/scout/reviewDeduplicationEngine';

interface FileTarget {
  filePath: string;
  originalFileName: string;
  reportType: 'DAILY' | 'WEEKLY';
  reportChannel: 'OPENTABLE_DAILY_REVIEW_REPORT' | 'OPENTABLE_WEEKLY_REVIEW_REPORT';
  coverageScope: 'OPENTABLE_DAILY_REVIEW_REPORT' | 'OPENTABLE_WEEKLY_REVIEW_REPORT';
  reportDateStr: string;
  coverageStartStr: string;
  coverageEndStr: string;
}

const TARGET_FILES: FileTarget[] = [
  {
    filePath: '/Users/alexandregarcia/Downloads/ReviewsReport_daily_20260823_bd1ebbb1-aade-47d7-b051-a3ca2b5f6d97.csv',
    originalFileName: 'ReviewsReport_daily_20260823_bd1ebbb1-aade-47d7-b051-a3ca2b5f6d97.csv',
    reportType: 'DAILY',
    reportChannel: 'OPENTABLE_DAILY_REVIEW_REPORT',
    coverageScope: 'OPENTABLE_DAILY_REVIEW_REPORT',
    reportDateStr: '2026-08-23',
    coverageStartStr: '2026-08-23T00:00:00Z',
    coverageEndStr: '2026-08-23T23:59:59Z'
  },
  {
    filePath: '/Users/alexandregarcia/Downloads/ReviewsReport_daily_20260824_2c62e4d4-5f2e-4ee7-a7a6-38310eb4f57d.csv',
    originalFileName: 'ReviewsReport_daily_20260824_2c62e4d4-5f2e-4ee7-a7a6-38310eb4f57d.csv',
    reportType: 'DAILY',
    reportChannel: 'OPENTABLE_DAILY_REVIEW_REPORT',
    coverageScope: 'OPENTABLE_DAILY_REVIEW_REPORT',
    reportDateStr: '2026-08-24',
    coverageStartStr: '2026-08-24T00:00:00Z',
    coverageEndStr: '2026-08-24T23:59:59Z'
  },
  {
    filePath: '/Users/alexandregarcia/Downloads/ReviewsReport_daily_20260825_8fb2caa3-9f06-476d-b67a-e433b5f65891.csv',
    originalFileName: 'ReviewsReport_daily_20260825_8fb2caa3-9f06-476d-b67a-e433b5f65891(1).csv',
    reportType: 'DAILY',
    reportChannel: 'OPENTABLE_DAILY_REVIEW_REPORT',
    coverageScope: 'OPENTABLE_DAILY_REVIEW_REPORT',
    reportDateStr: '2026-08-25',
    coverageStartStr: '2026-08-25T00:00:00Z',
    coverageEndStr: '2026-08-25T23:59:59Z'
  },
  {
    filePath: '/Users/alexandregarcia/Downloads/ReviewsReport_weekly_20260817_7bf72489-3a50-45c9-aa07-b543c757fcd2.csv',
    originalFileName: 'ReviewsReport_weekly_20260817_7bf72489-3a50-45c9-aa07-b543c757fcd2.csv',
    reportType: 'WEEKLY',
    reportChannel: 'OPENTABLE_WEEKLY_REVIEW_REPORT',
    coverageScope: 'OPENTABLE_WEEKLY_REVIEW_REPORT',
    reportDateStr: '2026-08-17',
    coverageStartStr: '2026-08-17T00:00:00Z',
    coverageEndStr: '2026-08-23T23:59:59Z'
  }
];

async function executePhase5B2MultiIngestion() {
  console.log('==================================================');
  console.log('PHASE 5B-2 — MULTI-REPORT AUTHENTIC INGESTION & CROSS-DATASET DEDUPLICATION');
  console.log('==================================================\n');

  // Match Target Location
  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Target location Texas de Brazil Tampa missing!');

  const fileReports: any[] = [];
  let totalRawRowsProcessed = 0;
  let totalNewContentItemsInserted = 0;
  let totalExistingContentItemsReused = 0;
  const allUniqueReviewIds = new Set<string>();

  for (const target of TARGET_FILES) {
    console.log(`--------------------------------------------------`);
    console.log(`Processing File: ${target.originalFileName}`);
    console.log(`--------------------------------------------------`);

    if (!fs.existsSync(target.filePath)) {
      throw new Error(`File not found: ${target.filePath}`);
    }

    const rawBuffer = fs.readFileSync(target.filePath);
    const rawContent = rawBuffer.toString('utf8');
    const fileHash = crypto.createHash('sha256').update(rawBuffer).digest('hex');

    // Parse CSV
    const rows: any[] = parse(rawContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    totalRawRowsProcessed += rows.length;

    // 1. Schema Fingerprinting & Compatibility Check
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    const schemaCheck = detectOpenTableCsvSchema(headers);

    if (!schemaCheck.isValid) {
      console.log(`❌ Schema Incompatible! Missing: ${schemaCheck.missingColumns.join(', ')}`);
      fileReports.push({
        filename: target.originalFileName,
        reportType: target.reportType,
        rawRows: rows.length,
        schemaStatus: 'SCHEMA_CHANGED',
        datasetCreated: 'NO',
        duplicateDataset: 'NO',
        newCanonicalReviews: 0,
        existingCanonicalReviewsMatched: 0,
        rejectedRows: rows.length,
        sourceBreakdown: 'N/A',
        coverageScope: target.coverageScope,
        activationStatus: 'FAILED'
      });
      continue;
    }

    // 2. Check for Duplicate File Content Hash
    const existingDatasetWithHash = await db.reviewDataset.findFirst({
      where: { fileHash, locationId: texasLoc.id }
    });

    if (existingDatasetWithHash) {
      console.log(`✔ Identical File Content Hash Detected! (Existing Dataset ID: ${existingDatasetWithHash.id})`);
      console.log(`  Flagging DUPLICATE_DATASET. Zero duplicate datasets or ContentItems created.`);

      fileReports.push({
        filename: target.originalFileName,
        reportType: target.reportType,
        rawRows: rows.length,
        schemaStatus: 'MATCH',
        datasetCreated: 'NO',
        duplicateDataset: 'YES',
        newCanonicalReviews: 0,
        existingCanonicalReviewsMatched: rows.length,
        rejectedRows: 0,
        sourceBreakdown: 'N/A',
        coverageScope: target.coverageScope,
        activationStatus: 'IMPORTED_PENDING_VALIDATION'
      });
      continue;
    }

    // 3. Create Dataset Entity
    const dataset = await db.reviewDataset.create({
      data: {
        organizationId: texasLoc.organizationId,
        locationId: texasLoc.id,
        provider: 'OPENTABLE',
        reportChannel: target.reportChannel,
        reportType: target.reportType,
        coverageScope: target.coverageScope,
        fileHash,
        restaurantId: '60256',
        reportDate: new Date(target.reportDateStr),
        acquisitionMethod: 'CLIENT_IMPORT',
        coverageType: 'COMPLETE',
        coverageStart: new Date(target.coverageStartStr),
        coverageEnd: new Date(target.coverageEndStr),
        declaredTotalRecords: rows.length,
        uploadedBy: 'operator@brasabrandpulse.com',
        uploadedAt: new Date(),
        sourceFileName: target.originalFileName,
        provenanceMode: 'IMPORTED',
        dataQualityStatus: 'HIGH',
        notes: `Bounded ${target.reportType} report coverage for ${target.reportDateStr}.`,
        verificationStatus: 'VERIFIED',
        activationStatus: 'IMPORTED_PENDING_VALIDATION',
        pipelineStatus: 'INGESTED'
      }
    });

    let newCountForFile = 0;
    let reusedCountForFile = 0;
    let rejectedCountForFile = 0;
    const sourceMap: Record<string, number> = {};

    // 4. Process Each Row
    for (const r of rows) {
      const csvSource = r['Source'] || 'Google';
      sourceMap[csvSource] = (sourceMap[csvSource] || 0) + 1;

      const reviewId = (r['Review ID'] || '').trim();
      if (reviewId) allUniqueReviewIds.add(reviewId);

      const guestName = r['Guest name'] || '';
      const dateStr = r['Review date'] || '';
      const ratingNum = parseFloat(r['Overall rating']) || 5.0;
      const comments = r['Review comments'] || '';
      const reply = r['Restaurant reply'] || '';
      const pubDate = isNaN(new Date(dateStr).getTime()) ? new Date(target.reportDateStr) : new Date(dateStr);

      const contentHash = computeReviewContentHash(comments, pubDate, guestName);

      // Check if canonical ContentItem already exists
      let existingCi = await db.contentItem.findFirst({
        where: {
          OR: [
            { externalId: reviewId },
            { contentHash }
          ]
        }
      });

      let canonicalCiId = existingCi?.id;

      if (!existingCi) {
        const dataSource = await db.dataSource.findFirst({ where: { id: 'OPENTABLE' } }) || await db.dataSource.findFirst();

        const newCi = await db.contentItem.create({
          data: {
            organizationId: texasLoc.organizationId,
            locationId: texasLoc.id,
            dataSourceId: dataSource?.id || 'MANUAL',
            externalId: reviewId || null,
            text: comments,
            rating: ratingNum,
            authorName: guestName,
            publishedAt: pubDate,
            acquisitionMethod: 'CLIENT_IMPORT',
            coverageType: 'COMPLETE',
            provenanceMode: 'IMPORTED',
            datasetId: dataset.id,
            contentHash,
            rowSource: csvSource,
            restaurantReply: reply || null,
            verificationStatus: 'VERIFIED',
            activationStatus: 'IMPORTED_PENDING_VALIDATION'
          }
        });
        canonicalCiId = newCi.id;
        newCountForFile++;
        totalNewContentItemsInserted++;
      } else {
        reusedCountForFile++;
        totalExistingContentItemsReused++;
      }

      // Link ContentItem to ReviewDataset via ReviewDatasetItem join model
      if (canonicalCiId) {
        await db.reviewDatasetItem.upsert({
          where: {
            datasetId_contentItemId: {
              datasetId: dataset.id,
              contentItemId: canonicalCiId
            }
          },
          update: {},
          create: {
            datasetId: dataset.id,
            contentItemId: canonicalCiId
          }
        });
      }
    }

    // Update dataset counters
    await db.reviewDataset.update({
      where: { id: dataset.id },
      data: {
        importedRecordCount: newCountForFile,
        duplicateCount: reusedCountForFile,
        rejectedCount: rejectedCountForFile
      }
    });

    const sourceBreakdownStr = Object.entries(sourceMap).map(([k, v]) => `${k}:${v}`).join(', ');

    fileReports.push({
      filename: target.originalFileName,
      reportType: target.reportType,
      rawRows: rows.length,
      schemaStatus: 'MATCH',
      datasetCreated: 'YES',
      duplicateDataset: 'NO',
      newCanonicalReviews: newCountForFile,
      existingCanonicalReviewsMatched: reusedCountForFile,
      rejectedRows: rejectedCountForFile,
      sourceBreakdown: sourceBreakdownStr,
      coverageScope: target.coverageScope,
      activationStatus: 'IMPORTED_PENDING_VALIDATION'
    });

    console.log(`  ✔ Raw Rows: ${rows.length} | New Canonical: ${newCountForFile} | Existing Reused: ${reusedCountForFile}`);
  }

  // 5. Aggregate Summary & Reconciliation
  const totalCanonicalReviews = await db.contentItem.count({
    where: { locationId: texasLoc.id, provenanceMode: 'IMPORTED' }
  });

  const googleCount = await db.contentItem.count({
    where: { locationId: texasLoc.id, provenanceMode: 'IMPORTED', rowSource: 'Google' }
  });

  const openTableCount = await db.contentItem.count({
    where: { locationId: texasLoc.id, provenanceMode: 'IMPORTED', rowSource: 'OpenTable' }
  });

  console.log('\n==================================================');
  console.log('PER-FILE DATASET IMPORT BREAKDOWN TABLE');
  console.log('==================================================');
  console.table(fileReports);

  console.log('\n==================================================');
  console.log('AGGREGATE PROVENANCE RECONCILIATION SUMMARY');
  console.log('==================================================');
  console.log(`Total Raw Rows Processed: ${totalRawRowsProcessed}`);
  console.log(`Total Unique Review IDs Across Files: ${allUniqueReviewIds.size}`);
  console.log(`Total New ContentItems Inserted: ${totalNewContentItemsInserted}`);
  console.log(`Total Existing ContentItems Reused: ${totalExistingContentItemsReused}`);
  console.log(`Total Canonical Authentic Review Records: ${totalCanonicalReviews}`);
  console.log(`  • Google-Source Canonical Reviews: ${googleCount}`);
  console.log(`  • OpenTable-Source Canonical Reviews: ${openTableCount}`);

  // 6. Cross-Dataset Provenance Check Example (Aug 23 Daily vs Weekly Report)
  console.log('\n==================================================');
  console.log('CROSS-DATASET PROVENANCE CHECK DEMONSTRATION');
  console.log('==================================================');

  // Find a review appearing in both Aug 23 Daily and Weekly
  const crossLinkedItems = await db.contentItem.findMany({
    where: { locationId: texasLoc.id },
    include: { datasetItems: true }
  });

  const sampleCross = crossLinkedItems.find(i => i.datasetItems.length > 1);

  if (sampleCross) {
    console.log(`✔ Cross-Dataset Overlap Verified!`);
    console.log(`  • Review ID: "${sampleCross.externalId}"`);
    console.log(`  • Canonical ContentItem ID: ${sampleCross.id}`);
    console.log(`  • Linked ReviewDataset Count: ${sampleCross.datasetItems.length}`);
  } else {
    console.log(`  • No multi-linked item found (single dataset links verified).`);
  }
}

executePhase5B2MultiIngestion().catch(err => {
  console.error('\n❌ PHASE 5B-2 MULTI-INGESTION FAILED:', err);
  process.exit(1);
});
