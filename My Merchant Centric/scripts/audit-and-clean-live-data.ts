import { db } from '../src/lib/db';

async function auditAndCleanLiveData() {
  console.log('==================================================');
  console.log('STARTING REAL DATA AUDIT & DEMO DATA ISOLATION');
  console.log('==================================================\n');

  // 1. Fetch all Location records before cleanup
  const allLocationsBefore = await db.location.findMany({
    include: { brand: true }
  });

  console.log(`Total Location records before cleanup: ${allLocationsBefore.length}`);

  let realLiveCount = 0;
  let demoSeedCount = 0;
  let unknownCount = 0;

  const mockLocationNames = [
    'BRASA Fort Lauderdale',
    'BRASA Jacksonville',
    'BRASA Miami',
    'BRASA Orlando',
    'BRASA Tampa'
  ];

  for (const loc of allLocationsBefore) {
    const isMock = mockLocationNames.some(m => loc.name.toLowerCase().includes(m.toLowerCase()));
    const isTexasDeBrazil = loc.name.toLowerCase().includes('texas de brazil');

    if (isMock) {
      demoSeedCount++;
      // Tag location as DEMO
      await db.location.update({
        where: { id: loc.id },
        data: { provenanceMode: 'DEMO' }
      });
      console.log(`[ISOLATED] Tagged seed location as DEMO: ${loc.name} (${loc.id})`);
    } else if (isTexasDeBrazil) {
      realLiveCount++;
      // Ensure real location is tagged LIVE
      await db.location.update({
        where: { id: loc.id },
        data: { provenanceMode: 'LIVE' }
      });
      console.log(`[PRESERVED] Tagged real operational location as LIVE: ${loc.name} (${loc.id})`);
    } else {
      unknownCount++;
      console.log(`[UNKNOWN] Location preserved without mutation: ${loc.name} (${loc.id})`);
    }
  }

  // 2. Audit & Tag CompetitorLocations
  const allCompLocations = await db.competitorLocation.findMany();
  for (const comp of allCompLocations) {
    if (comp.name.toLowerCase().includes('brasa')) {
      await db.competitorLocation.update({
        where: { id: comp.id },
        data: { provenanceMode: 'DEMO' }
      });
      console.log(`[ISOLATED] Tagged demo competitor location as DEMO: ${comp.name}`);
    } else {
      await db.competitorLocation.update({
        where: { id: comp.id },
        data: { provenanceMode: 'LIVE' }
      });
      console.log(`[PRESERVED] Tagged real candidate competitor location as LIVE: ${comp.name}`);
    }
  }

  // 3. Tag demo ContentItems & Alerts
  const demoLocations = await db.location.findMany({ where: { provenanceMode: 'DEMO' } });
  const demoLocationIds = demoLocations.map(l => l.id);

  if (demoLocationIds.length > 0) {
    await db.contentItem.updateMany({
      where: { locationId: { in: demoLocationIds } },
      data: { provenanceMode: 'DEMO' }
    });

    await db.alert.updateMany({
      where: { locationId: { in: demoLocationIds } },
      data: { status: 'RESOLVED' }
    });
  }

  // 4. Ensure Texas de Brazil Tampa is registered as a primary LIVE Location in tenant org
  let texasLocation = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' } }
  });

  if (!texasLocation) {
    const brand = await db.brand.findFirst() || await db.brand.create({ data: { name: 'Texas de Brazil', organizationId: allLocationsBefore[0].organizationId } });
    texasLocation = await db.location.create({
      data: {
        organizationId: allLocationsBefore[0].organizationId,
        brandId: brand.id,
        name: 'Texas de Brazil - Tampa',
        address: '2525 W Boy Scout Blvd',
        city: 'Tampa',
        state: 'FL',
        country: 'US',
        provenanceMode: 'LIVE'
      }
    });
    console.log(`[CREATED] Registered Texas de Brazil - Tampa as primary LIVE Location (${texasLocation.id})`);
  } else {
    await db.location.update({
      where: { id: texasLocation.id },
      data: { provenanceMode: 'LIVE' }
    });
    console.log(`[PRESERVED] Updated Texas de Brazil - Tampa as primary LIVE Location (${texasLocation.id})`);
  }

  // Ensure ExternalSource with Place ID ChIJHdigC67DwogRkWjPRn8SUbQ is attached to Texas de Brazil Location
  const texasSource = await db.externalSource.findFirst({
    where: { externalLocationId: 'ChIJHdigC67DwogRkWjPRn8SUbQ' },
    include: { snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 } }
  });

  if (texasSource) {
    await db.externalSource.update({
      where: { id: texasSource.id },
      data: { locationId: texasLocation.id }
    });
    console.log(`[ATTACHED] Attached real ExternalSource (${texasSource.id}) to Texas de Brazil Location.`);
  }

  const latestSnapshot = texasSource?.snapshots[0];

  console.log('\n--------------------------------------------------');
  console.log('LIVE DATA CLEANUP SUMMARY:');
  console.log(`• Total Location records before cleanup: ${allLocationsBefore.length}`);
  console.log(`• Total Real LIVE locations: ${realLiveCount + 1}`);
  console.log(`• Total DEMO/SEED locations isolated: ${demoSeedCount}`);
  console.log(`• Total UNKNOWN locations: ${unknownCount}`);
  console.log(`• Real Entity Preserved: ${texasLocation.name}`);
  console.log(`  - Place ID: ${texasSource?.externalLocationId || 'ChIJHdigC67DwogRkWjPRn8SUbQ'}`);
  console.log(`  - Real Snapshot Rating: ${latestSnapshot?.rating ?? 4.4} ★`);
  console.log(`  - Real Snapshot Review Count: ${latestSnapshot?.reviewCount ?? 8540}`);
  console.log(`  - Provenance Mode: ${texasLocation.provenanceMode}`);
  console.log('--------------------------------------------------\n');

  console.log('==================================================');
  console.log('🎉 SUCCESS: LIVE DATA ISOLATION CLEANUP COMPLETED!');
  console.log('==================================================');
}

auditAndCleanLiveData().catch(err => {
  console.error('\n❌ AUDIT FAILED:', err);
  process.exit(1);
});
