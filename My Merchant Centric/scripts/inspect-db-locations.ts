import { db } from '../src/lib/db';

async function inspectLocations() {
  const allLocs = await db.location.findMany({
    select: {
      id: true,
      name: true,
      organizationId: true,
      status: true,
      businessStatus: true,
      provenanceMode: true
    }
  });

  console.log(`Total Locations in DB: ${allLocs.length}`);
  console.log('Sample locations:');
  allLocs.slice(0, 10).forEach(l => {
    console.log(`  • ${l.name} | org: ${l.organizationId} | status: "${l.status}" | bizStatus: "${l.businessStatus}" | provMode: "${l.provenanceMode}"`);
  });

  const tampa = allLocs.find(l => l.name.includes('Tampa'));
  console.log('\nTampa org ID:', tampa?.organizationId);

  const mismatchOrg = allLocs.filter(l => l.organizationId !== tampa?.organizationId);
  console.log(`Locations with different org ID than Tampa: ${mismatchOrg.length}`);

  const mismatchStatus = allLocs.filter(l => l.status !== 'ACTIVE');
  console.log(`Locations with status != 'ACTIVE': ${mismatchStatus.length}`);

  const mismatchProv = allLocs.filter(l => !['LIVE', 'IMPORTED'].includes(l.provenanceMode || ''));
  console.log(`Locations with provenanceMode not in ['LIVE', 'IMPORTED']: ${mismatchProv.length}`);
}

inspectLocations().catch(console.error);
