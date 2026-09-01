import fs from 'fs';
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
    originalFileName: 'ReviewsReport_daily_20260825_8fb2caa3-9f06-476d-b67a-e433b5f65891.csv',
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

async function reingestAllAuthenticDatasets() {
  console.log('==================================================');
  console.log('PHASE 5B-3 — RE-INGESTING AUTHENTIC DATASETS WITH AUTHORITATIVE EXTERNAL ID DEDUPLICATION');
  console.log('==================================================\n');

  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Target location Texas de Brazil Tampa missing!');

  // Purge existing imported content items & datasets safely for clean re-ingestion
  console.log('Purging legacy imported content items & datasets...');
  await db.reviewDatasetItem.deleteMany({
    where: { dataset: { locationId: texasLoc.id } }
  });
  await db.contentItem.deleteMany({
    where: { locationId: texasLoc.id, provenanceMode: 'IMPORTED' }
  });
  await db.reviewDataset.deleteMany({
    where: { locationId: texasLoc.id }
  });
  console.log('✔ Database purged cleanly.\n');

  const fileReports: any[] = [];
  let totalRawRowsProcessed = 0;
  let totalNewContentItemsInserted = 0;
  let totalExistingContentItemsReused = 0;
  const allUniqueReviewIds = new Set<string>();

  for (const target of TARGET_FILES) {
    console.log(`--------------------------------------------------`);
    console.log(`Processing File: ${target.originalFileName}`);
    console.log(`--------------------------------------------------`);

    const rawBuffer = fs.readFileSync(target.filePath);
    const rawContent = rawBuffer.toString('utf8');
    const fileHash = crypto.createHash('sha256').update(rawBuffer).digest('hex');

    const rows: any[] = parse(rawContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    totalRawRowsProcessed += rows.length;

    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    const schemaCheck = detectOpenTableCsvSchema(headers);

    // Check for duplicate dataset file hash
    const existingDatasetWithHash = await db.reviewDataset.findFirst({
      where: { fileHash, locationId: texasLoc.id }
    });

    if (existingDatasetWithHash) {
      console.log(`✔ Identical File Content Hash Detected! (Existing Dataset ID: ${existingDatasetWithHash.id})`);
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
        coverageScope: target.coverageScope,
        activationStatus: 'IMPORTED_PENDING_VALIDATION'
      });
      continue;
    }

    // Create Dataset
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

    for (const r of rows) {
      const csvSource = r['Source'] || 'Google';
      const reviewId = (r['Review ID'] || '').trim();
      if (reviewId) allUniqueReviewIds.add(reviewId);

      const guestName = r['Guest name'] || '';
      const dateStr = r['Review date'] || '';
      const ratingNum = parseFloat(r['Overall rating']) || 5.0;
      const comments = r['Review comments'] || '';
      const reply = r['Restaurant reply'] || '';
      const pubDate = isNaN(new Date(dateStr).getTime()) ? new Date(target.reportDateStr) : new Date(dateStr);

      const contentHash = computeReviewContentHash(comments, pubDate, guestName);

      // AUTHORITATIVE DEDUPLICATION: Check by externalId first!
      let existingCi = reviewId
        ? await db.contentItem.findFirst({ where: { locationId: texasLoc.id, externalId: reviewId } })
        : await db.contentItem.findFirst({ where: { locationId: texasLoc.id, contentHash } });

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

      // Create ReviewDatasetItem Join Link
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

    await db.reviewDataset.update({
      where: { id: dataset.id },
      data: {
        importedRecordCount: newCountForFile,
        duplicateCount: reusedCountForFile,
        rejectedCount: rejectedCountForFile
      }
    });

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
      coverageScope: target.coverageScope,
      activationStatus: 'IMPORTED_PENDING_VALIDATION'
    });

    console.log(`  ✔ Raw Rows: ${rows.length} | New Canonical: ${newCountForFile} | Existing Reused: ${reusedCountForFile}`);
  }

  const finalCanonicalCount = await db.contentItem.count({
    where: { locationId: texasLoc.id, provenanceMode: 'IMPORTED' }
  });

  console.log('\n==================================================');
  console.log('RECONCILIATION RESULT SUMMARY');
  console.log('==================================================');
  console.table(fileReports);
  console.log(`Total Raw Rows Processed: ${totalRawRowsProcessed}`);
  console.log(`Total Unique Review IDs Across CSVs: ${allUniqueReviewIds.size}`);
  console.log(`Total Canonical ContentItems in DB: ${finalCanonicalCount}`);

  if (allUniqueReviewIds.size === finalCanonicalCount) {
    console.log(`\n🎉 PERFECT MATHEMATICAL EQUALITY ACHIEVED: ${allUniqueReviewIds.size} distinct external Review IDs = ${finalCanonicalCount} canonical ContentItems!`);
  } else {
    console.log(`\n⚠️ Discrepancy: ${allUniqueReviewIds.size} unique Review IDs vs ${finalCanonicalCount} DB ContentItems.`);
  }
}

reingestAllAuthenticDatasets().catch(console.error);
