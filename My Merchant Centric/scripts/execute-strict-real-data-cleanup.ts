import { db } from '../src/lib/db';

async function executeStrictRealDataCleanup() {
  console.log('==================================================');
  console.log('STARTING STRICT REAL-DATA CLEANUP & ISOLATION');
  console.log('==================================================\n');

  const tenantOrg = await db.organization.findFirst({ where: { name: { contains: 'Demo' } } }) || await db.organization.findFirst();
  if (!tenantOrg) throw new Error('Tenant organization missing');

  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' } }
  });

  if (!texasLoc) throw new Error('Texas de Brazil location record missing');

  // 1. Tag all test-script reviews as DEMO
  const demoReviews = await db.contentItem.updateMany({
    where: { locationId: texasLoc.id },
    data: {
      provenanceMode: 'DEMO',
      coverageType: 'SAMPLE'
    }
  });
  console.log(`[CLEANUP 1] Tagged ${demoReviews.count} test ContentItem review(s) as DEMO.`);

  // 2. Tag all test ScoreSnapshots as DEMO
  const demoScores = await db.scoreSnapshot.updateMany({
    where: { locationId: texasLoc.id },
    data: { provenanceMode: 'DEMO' }
  });
  console.log(`[CLEANUP 2] Tagged ${demoScores.count} test ScoreSnapshot(s) as DEMO.`);

  // 3. Tag all test Alerts as DEMO
  const demoAlerts = await db.alert.updateMany({
    where: { locationId: texasLoc.id },
    data: { provenanceMode: 'DEMO' }
  });
  console.log(`[CLEANUP 3] Tagged ${demoAlerts.count} test Alert(s) as DEMO.`);

  // 4. Tag all test RecoveryCases as DEMO
  const demoRecovery = await db.recoveryCase.updateMany({
    where: { locationId: texasLoc.id },
    data: { provenanceMode: 'DEMO' }
  });
  console.log(`[CLEANUP 4] Tagged ${demoRecovery.count} test RecoveryCase(s) as DEMO.`);

  // 5. Remove heuristically generated candidate competitors from LIVE competitive sets
  const compSets = await db.competitiveSet.findMany({
    where: { locationId: texasLoc.id }
  });

  for (const cs of compSets) {
    await db.competitiveSetMember.updateMany({
      where: { competitiveSetId: cs.id },
      data: {
        provenanceMode: 'DEMO',
        status: 'PENDING',
        approvedByUser: false,
        approvedBy: null,
        approvedAt: null
      }
    });
  }

  // Tag candidate CompetitorLocations as DEMO so they do not leak as LIVE monitored entities
  await db.competitorLocation.updateMany({
    data: { provenanceMode: 'DEMO' }
  });

  console.log(`[CLEANUP 5] Isolated candidate competitors and CompetitorLocations. Tagged as DEMO.`);

  // 6. Update SourceSnapshot coverage to METADATA_ONLY
  const extSource = await db.externalSource.findFirst({
    where: { locationId: texasLoc.id }
  });

  if (extSource) {
    await db.sourceSnapshot.updateMany({
      where: { externalSourceId: extSource.id },
      data: { coverageType: 'METADATA_ONLY' }
    });
  }

  // 7. Verify LIVE Counts in DB
  const liveReviews = await db.contentItem.count({
    where: { locationId: texasLoc.id, provenanceMode: { in: ['LIVE', 'IMPORTED'] } }
  });

  const liveScores = await db.scoreSnapshot.count({
    where: { locationId: texasLoc.id, provenanceMode: { in: ['LIVE', 'IMPORTED'] } }
  });

  const liveAlertsCount = await db.alert.count({
    where: { locationId: texasLoc.id, provenanceMode: { in: ['LIVE', 'IMPORTED'] } }
  });

  const liveRecoveryCount = await db.recoveryCase.count({
    where: { locationId: texasLoc.id, provenanceMode: { in: ['LIVE', 'IMPORTED'] } }
  });

  const liveApprovedComps = await db.competitiveSetMember.count({
    where: { status: 'APPROVED', approvedByUser: true, provenanceMode: { in: ['LIVE', 'IMPORTED'] } }
  });

  console.log('\n--------------------------------------------------');
  console.log('STRICT REAL-DATA AUDIT STATE FOR TEXAS DE BRAZIL TAMPA:');
  console.log(`• LIVE ContentItems / Reviews: ${liveReviews}`);
  console.log(`• LIVE ScoreSnapshots: ${liveScores}`);
  console.log(`• LIVE Alerts: ${liveAlertsCount}`);
  console.log(`• LIVE RecoveryCases: ${liveRecoveryCount}`);
  console.log(`• LIVE Approved Competitors: ${liveApprovedComps}`);
  console.log(`• Location Coverage Type: METADATA_ONLY`);
  console.log('--------------------------------------------------\n');

  console.log('==================================================');
  console.log('🎉 STRICT REAL-DATA CLEANUP COMPLETED SUCCESSFULLY');
  console.log('==================================================');
}

executeStrictRealDataCleanup().catch(err => {
  console.error('\n❌ STRICT CLEANUP FAILED:', err);
  process.exit(1);
});
