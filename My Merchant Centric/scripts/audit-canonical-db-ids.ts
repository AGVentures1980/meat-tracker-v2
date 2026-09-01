import { db } from '../src/lib/db';

async function auditCanonicalDbIds() {
  console.log('==================================================');
  console.log('PHASE 6A-3 — CANONICAL CONTENTITEM IDENTITY INTEGRITY AUDIT');
  console.log('==================================================\n');

  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Texas location missing!');

  // Query actual ContentItems directly from DB
  const items = await db.contentItem.findMany({
    where: { locationId: texasLoc.id, provenanceMode: 'IMPORTED' },
    include: {
      datasetItems: true,
      sentimentAnalysis: true,
      topicMentions: true,
      menuMentions: true,
      employeeMentions: true,
      competitorMentions: true
    },
    orderBy: [{ rating: 'asc' }, { publishedAt: 'desc' }]
  });

  console.log(`Total Canonical ContentItems in DB: ${items.length}\n`);

  const manifestRows: any[] = [];
  let totalDerivedRecords = 0;
  let orphanDerivedRecords = 0;

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const textPresent = !!(item.text && item.text.trim());
    const datasetLinkCount = item.datasetItems.length;

    const derivationCount =
      (item.sentimentAnalysis ? 1 : 0) +
      item.topicMentions.length +
      item.menuMentions.length +
      item.employeeMentions.length +
      item.competitorMentions.length;

    totalDerivedRecords += derivationCount;

    manifestRows.push({
      '#': idx + 1,
      'externalReviewId': item.externalId || 'N/A',
      'actual persisted ContentItem.id': item.id,
      'source': item.rowSource || 'Google',
      'rating': `${item.rating}★`,
      'textPresent': textPresent ? 'YES' : 'NO',
      'ReviewDataset link count': datasetLinkCount,
      'analytics derivation count': derivationCount
    });
  }

  console.log('--------------------------------------------------');
  console.log('FULL 33-RECORD AUTHORITATIVE CANONICAL MANIFEST');
  console.log('--------------------------------------------------');
  console.table(manifestRows);

  // Foreign Key Integrity Audit for Derived Tables
  console.log('\n--------------------------------------------------');
  console.log('FOREIGN KEY INTEGRITY AUDIT FOR DERIVED TABLES');
  console.log('--------------------------------------------------');

  const allCiIds = new Set(items.map(i => i.id));

  const sentiments = await db.sentimentAnalysis.findMany({ where: { contentItem: { locationId: texasLoc.id } } });
  const topics = await db.topicMention.findMany({ where: { contentItem: { locationId: texasLoc.id } } });
  const menus = await db.menuMention.findMany({ where: { contentItem: { locationId: texasLoc.id } } });
  const emps = await db.employeeMention.findMany({ where: { contentItem: { locationId: texasLoc.id } } });
  const comps = await db.competitorMention.findMany({ where: { contentItem: { locationId: texasLoc.id } } });

  const orphanSentiments = sentiments.filter(s => !allCiIds.has(s.contentItemId));
  const orphanTopics = topics.filter(t => !allCiIds.has(t.contentItemId));
  const orphanMenus = menus.filter(m => !allCiIds.has(m.contentItemId));
  const orphanEmps = emps.filter(e => !allCiIds.has(e.contentItemId));
  const orphanComps = comps.filter(c => !allCiIds.has(c.contentItemId));

  orphanDerivedRecords = orphanSentiments.length + orphanTopics.length + orphanMenus.length + orphanEmps.length + orphanComps.length;

  console.log(`Sentiments Count: ${sentiments.length} (Orphans: ${orphanSentiments.length})`);
  console.log(`TopicMentions Count: ${topics.length} (Orphans: ${orphanTopics.length})`);
  console.log(`MenuMentions Count: ${menus.length} (Orphans: ${orphanMenus.length})`);
  console.log(`EmployeeMentions Count: ${emps.length} (Orphans: ${orphanEmps.length})`);
  console.log(`CompetitorMentions Count: ${comps.length} (Orphans: ${orphanComps.length})`);
  console.log(`Total Derived Records: ${sentiments.length + topics.length + menus.length + emps.length + comps.length}`);
  console.log(`Total Orphan Derived Records: ${orphanDerivedRecords}`);

  // Spot-check known examples
  console.log('\n--------------------------------------------------');
  console.log('KNOWN EXAMPLES SPOT-CHECK');
  console.log('--------------------------------------------------');
  const target1 = items.find(i => i.externalId === 'RT-60256-6a8c9442e080750001fb092b');
  const target2 = items.find(i => i.externalId === 'OT-60256-1000080572-120182057142');
  const target3 = items.find(i => i.externalId === 'OT-60256-1000080888-100056581810');

  console.log(`1. RT-60256-6a8c9442e080750001fb092b (William Mccann): Actual DB ContentItem.id = "${target1?.id}"`);
  console.log(`2. OT-60256-1000080572-120182057142 (Rutger): Actual DB ContentItem.id = "${target2?.id}"`);
  console.log(`3. OT-60256-1000080888-100056581810 (precious): Actual DB ContentItem.id = "${target3?.id}"`);
}

auditCanonicalDbIds().catch(console.error);
