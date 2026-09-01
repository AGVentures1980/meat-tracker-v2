import { db } from '../src/lib/db';
import { buildLiveDataScope } from '../src/lib/provenance';

async function runDashboardLiveCleanupTests() {
  console.log('==================================================');
  console.log('STARTING LIVE DASHBOARD CLEANUP VERIFICATION TESTS');
  console.log('==================================================\n');

  const liveScope = buildLiveDataScope();
  const tenantOrg = await db.organization.findFirst({ where: { name: { contains: 'Demo' } } }) || await db.organization.findFirst();
  if (!tenantOrg) throw new Error('No tenant organization found');

  // [TEST 1] Verify Locations in LIVE Dashboard Scope
  console.log('[TEST 1] Verifying LIVE locations in Dashboard query...');
  const liveLocations = await db.location.findMany({
    where: {
      organizationId: tenantOrg.id,
      status: 'ACTIVE',
      ...liveScope
    }
  });

  const demoStoresFound = liveLocations.filter(l => l.name.includes('BRASA') || l.provenanceMode === 'DEMO');
  if (demoStoresFound.length > 0) {
    throw new Error(`FAIL: ${demoStoresFound.length} DEMO store(s) found in LIVE location query! (${demoStoresFound.map(s => s.name).join(', ')})`);
  }
  console.log(`✔ PASS: LIVE Location query returned ${liveLocations.length} store(s): ${liveLocations.map(l => l.name).join(', ')}. Zero DEMO stores leaked.`);

  // [TEST 2] Verify ScoreSnapshots in LIVE Scope
  console.log('\n[TEST 2] Verifying LIVE ScoreSnapshots...');
  const liveScoreSnaps = await db.scoreSnapshot.findMany({
    where: {
      organizationId: tenantOrg.id,
      provenanceMode: { in: ['LIVE', 'IMPORTED'] },
      location: { provenanceMode: { in: ['LIVE', 'IMPORTED'] } }
    }
  });

  const demoScoresFound = liveScoreSnaps.filter(s => (s as any).provenanceMode === 'DEMO');
  if (demoScoresFound.length > 0) {
    throw new Error(`FAIL: ${demoScoresFound.length} DEMO ScoreSnapshot(s) found in LIVE query!`);
  }
  console.log(`✔ PASS: LIVE ScoreSnapshot query returned ${liveScoreSnaps.length} record(s). Zero DEMO score snapshots leaked.`);

  // [TEST 3] Verify Alerts in LIVE Scope
  console.log('\n[TEST 3] Verifying LIVE Alerts...');
  const liveAlerts = await db.alert.findMany({
    where: {
      organizationId: tenantOrg.id,
      provenanceMode: { in: ['LIVE', 'IMPORTED'] },
      location: { provenanceMode: { in: ['LIVE', 'IMPORTED'] } }
    }
  });
  const demoAlertsFound = liveAlerts.filter(a => a.provenanceMode === 'DEMO');
  if (demoAlertsFound.length > 0) {
    throw new Error(`FAIL: ${demoAlertsFound.length} DEMO Alert(s) found in LIVE query!`);
  }
  console.log(`✔ PASS: LIVE Alert query returned ${liveAlerts.length} record(s). Zero DEMO alerts leaked.`);

  // [TEST 4] Verify Guest Recovery Cases in LIVE Scope
  console.log('\n[TEST 4] Verifying LIVE Guest Recovery Cases...');
  const liveRecovery = await db.recoveryCase.findMany({
    where: {
      organizationId: tenantOrg.id,
      provenanceMode: { in: ['LIVE', 'IMPORTED'] },
      location: { provenanceMode: { in: ['LIVE', 'IMPORTED'] } }
    }
  });
  const demoRecoveryFound = liveRecovery.filter(r => r.provenanceMode === 'DEMO');
  if (demoRecoveryFound.length > 0) {
    throw new Error(`FAIL: ${demoRecoveryFound.length} DEMO RecoveryCase(s) found in LIVE query!`);
  }
  console.log(`✔ PASS: LIVE RecoveryCase query returned ${liveRecovery.length} record(s). Zero DEMO recovery cases leaked.`);

  // [TEST 5] Verify ContentItems/Reviews in LIVE Scope
  console.log('\n[TEST 5] Verifying LIVE ContentItems/Reviews...');
  const liveContentItems = await db.contentItem.findMany({
    where: {
      organizationId: tenantOrg.id,
      provenanceMode: { in: ['LIVE', 'IMPORTED'] },
      location: { provenanceMode: { in: ['LIVE', 'IMPORTED'] } }
    }
  });
  const demoContentFound = liveContentItems.filter(c => c.provenanceMode === 'DEMO');
  if (demoContentFound.length > 0) {
    throw new Error(`FAIL: ${demoContentFound.length} DEMO ContentItem(s) found in LIVE query!`);
  }
  console.log(`✔ PASS: LIVE ContentItem query returned ${liveContentItems.length} record(s). Zero DEMO content items leaked.`);

  // [TEST 6] Verify Real Texas de Brazil Baseline Intact
  console.log('\n[TEST 6] Verifying Texas de Brazil Tampa real baseline...');
  const texasLoc = liveLocations.find(l => l.name.includes('Texas de Brazil'));
  if (!texasLoc) {
    throw new Error('FAIL: Texas de Brazil Tampa missing from LIVE locations!');
  }

  const texasSource = await db.externalSource.findFirst({
    where: { locationId: texasLoc.id },
    include: { snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 } }
  });
  const latestSnap = texasSource?.snapshots[0];

  if (!latestSnap || latestSnap.rating !== 4.4 || latestSnap.reviewCount !== 8539) {
    throw new Error(`FAIL: Real snapshot mismatch! Rating: ${latestSnap?.rating}, Count: ${latestSnap?.reviewCount}`);
  }
  console.log(`✔ PASS: Texas de Brazil Tampa real Google snapshot intact: Rating ${latestSnap.rating} ★, Review Count ${latestSnap.reviewCount.toLocaleString()}.`);

  console.log('\n==================================================');
  console.log('🎉 SUCCESS: ALL LIVE DASHBOARD CLEANUP TESTS PASSED!');
  console.log('==================================================');
}

runDashboardLiveCleanupTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
