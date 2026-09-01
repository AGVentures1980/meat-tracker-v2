import { db } from '../src/lib/db';

async function isolateDemoChildRecords() {
  console.log('==================================================');
  console.log('STARTING DEMO CHILD RECORD ISOLATION & DATA CLEANUP');
  console.log('==================================================\n');

  // 1. Identify DEMO Locations
  const demoLocations = await db.location.findMany({
    where: {
      OR: [
        { provenanceMode: 'DEMO' },
        { name: { contains: 'BRASA' } }
      ]
    }
  });

  const demoLocIds = demoLocations.map(l => l.id);
  console.log(`Found ${demoLocations.length} DEMO location(s): ${demoLocations.map(l => l.name).join(', ')}`);

  // Ensure all DEMO locations have provenanceMode = 'DEMO'
  await db.location.updateMany({
    where: { id: { in: demoLocIds } },
    data: { provenanceMode: 'DEMO' }
  });

  // 2. Isolate ContentItems linked to DEMO locations
  const isolatedContentItems = await db.contentItem.updateMany({
    where: { locationId: { in: demoLocIds } },
    data: { provenanceMode: 'DEMO' }
  });
  console.log(`[ISOLATED] Tagged ${isolatedContentItems.count} ContentItem record(s) as DEMO.`);

  // 3. Isolate Alerts linked to DEMO locations
  const isolatedAlerts = await db.alert.updateMany({
    where: { locationId: { in: demoLocIds } },
    data: { provenanceMode: 'DEMO' }
  });
  console.log(`[ISOLATED] Tagged ${isolatedAlerts.count} Alert record(s) as DEMO.`);

  // 4. Isolate RecoveryCases linked to DEMO locations
  const isolatedRecovery = await db.recoveryCase.updateMany({
    where: { locationId: { in: demoLocIds } },
    data: { provenanceMode: 'DEMO' }
  });
  console.log(`[ISOLATED] Tagged ${isolatedRecovery.count} RecoveryCase record(s) as DEMO.`);

  // 5. Isolate ScoreSnapshots linked to DEMO locations
  const isolatedScores = await db.scoreSnapshot.updateMany({
    where: { locationId: { in: demoLocIds } },
    data: { provenanceMode: 'DEMO' }
  });
  console.log(`[ISOLATED] Tagged ${isolatedScores.count} ScoreSnapshot record(s) as DEMO.`);

  // 6. Verify Texas de Brazil - Tampa is the sole LIVE location
  const liveLocations = await db.location.findMany({
    where: { provenanceMode: { in: ['LIVE', 'IMPORTED'] } }
  });
  console.log(`\nLIVE/IMPORTED Locations in system: ${liveLocations.length} (${liveLocations.map(l => l.name).join(', ')})`);

  console.log('\n==================================================');
  console.log('🎉 DEMO CHILD RECORD ISOLATION COMPLETED SUCCESSFULLY!');
  console.log('==================================================');
}

isolateDemoChildRecords().catch(err => {
  console.error('\n❌ ISOLATION FAILED:', err);
  process.exit(1);
});
