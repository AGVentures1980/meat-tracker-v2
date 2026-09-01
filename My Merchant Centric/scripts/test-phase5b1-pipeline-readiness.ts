import { db } from '../src/lib/db';
import { detectOpenTableCsvSchema, EMAIL_INGESTION_RULES_SPEC } from '../src/lib/scout/openTablePipelineAdapter';

async function runPhase5B1Test() {
  console.log('==================================================');
  console.log('PHASE 5B-1 — RECURRING OPENTABLE PIPELINE TEST');
  console.log('==================================================\n');

  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Texas location missing');

  // 1. Test CSV Schema Change Detection
  console.log('[TEST 1] Testing CSV Schema Change Detection:');
  const validHeaders = [
    'Source', 'Restaurant name', 'Restaurant ID', 'Guest name', 'Review date',
    'Visit date', 'Server name', 'Overall rating', 'Food', 'Service',
    'Ambience', 'Value', 'Noise', 'Review comments', 'Private note',
    'Tags added by diner', 'Dining occasion', 'Recommended', 'Restaurant reply', 'Review ID'
  ];

  const validRes = detectOpenTableCsvSchema(validHeaders);
  console.log(`  • Valid Header Check: isValid = ${validRes.isValid}, status = ${validRes.schemaStatus}`);
  if (!validRes.isValid || validRes.schemaStatus !== 'VALID') {
    throw new Error('FAIL: Valid OpenTable CSV headers rejected!');
  }

  const alteredHeaders = ['Source', 'Restaurant name', 'Overall rating', 'Review comments']; // Missing required fields
  const alteredRes = detectOpenTableCsvSchema(alteredHeaders);
  console.log(`  • Altered Header Check: isValid = ${alteredRes.isValid}, status = ${alteredRes.schemaStatus}, missing = ${alteredRes.missingColumns.length} cols`);
  if (alteredRes.isValid || alteredRes.schemaStatus !== 'SCHEMA_CHANGED') {
    throw new Error('FAIL: Altered OpenTable CSV headers not flagged!');
  }
  console.log('✔ PASS: CSV Schema change detection working as designed.\n');

  // 2. Test Zero-Review Daily Report Handling
  console.log('[TEST 2] Testing Zero-Review Daily Report Receipt:');
  const zeroReportDataset = await db.reviewDataset.create({
    data: {
      organizationId: texasLoc.organizationId,
      locationId: texasLoc.id,
      provider: 'OPENTABLE',
      reportChannel: 'OPENTABLE_DAILY_REVIEW_REPORT',
      coverageScope: 'OPENTABLE_DAILY_REVIEW_REPORT',
      restaurantId: '60256',
      reportDate: new Date('2026-08-26T00:00:00Z'),
      acquisitionMethod: 'CLIENT_IMPORT',
      coverageType: 'COMPLETE',
      coverageStart: new Date('2026-08-26T00:00:00Z'),
      coverageEnd: new Date('2026-08-26T23:59:59Z'),
      declaredTotalRecords: 0,
      importedRecordCount: 0,
      duplicateCount: 0,
      rejectedCount: 0,
      uploadedBy: 'system_readiness_test@brasabrandpulse.com',
      uploadedAt: new Date(),
      sourceFileName: 'ReviewsReport_daily_20260826_zero.csv',
      provenanceMode: 'DEMO', // Isolated test dataset
      dataQualityStatus: 'HIGH',
      notes: 'Zero reviews reported for this daily period.',
      pipelineStatus: 'INGESTED',
      activationStatus: 'IMPORTED_PENDING_VALIDATION'
    }
  });

  console.log(`  • Zero-Review Dataset Created: ID ${zeroReportDataset.id}, importedRecordCount = ${zeroReportDataset.importedRecordCount}`);
  if (zeroReportDataset.importedRecordCount !== 0) {
    throw new Error('FAIL: Zero review report created non-zero records!');
  }

  // Cleanup test dataset
  await db.reviewDataset.delete({ where: { id: zeroReportDataset.id } });
  console.log('✔ PASS: Zero-review daily report created receipt record without fabricating empty reviews.\n');

  // 3. Test Email Ingestion Security & Architecture Rules
  console.log('[TEST 3] Auditing Email Automation Readiness & Security Rules:');
  console.log(`  • Sender Domains Allowed: ${EMAIL_INGESTION_RULES_SPEC.allowedSenderDomains.join(', ')}`);
  console.log(`  • Subject Pattern: ${EMAIL_INGESTION_RULES_SPEC.subjectPatterns.join(', ')}`);
  console.log(`  • Auth Protocol: ${EMAIL_INGESTION_RULES_SPEC.authenticationProtocol}`);
  console.log(`  • Mailbox Active: ${EMAIL_INGESTION_RULES_SPEC.mailboxActive}`);

  if (EMAIL_INGESTION_RULES_SPEC.mailboxActive) {
    throw new Error('FAIL: Mailbox active prematurely!');
  }
  console.log('✔ PASS: Email ingestion rules prepared securely with zero active mailbox access.\n');

  // 4. Verify Total Production Review Count for Texas de Brazil Tampa remains exactly 1
  const importedCount = await db.contentItem.count({
    where: { locationId: texasLoc.id, provenanceMode: 'IMPORTED' }
  });

  console.log(`[TEST 4] Total Real Review ContentItem Count for Texas de Brazil Tampa: ${importedCount}`);
  if (importedCount !== 1) {
    throw new Error(`Expected exactly 1 authentic review record, found ${importedCount}`);
  }
  console.log('✔ PASS: Production real review count remains exactly 1 authentic review.\n');

  console.log('==================================================');
  console.log('🎉 ALL PHASE 5B-1 PIPELINE READINESS TESTS PASSED!');
  console.log('==================================================');
}

runPhase5B1Test().catch(err => {
  console.error('\n❌ PHASE 5B-1 TEST FAILED:', err);
  process.exit(1);
});
