import { db } from '../src/lib/db';

async function inspectStates() {
  const allLocs = await db.location.findMany({
    select: {
      name: true,
      city: true,
      state: true,
      country: true
    },
    orderBy: { name: 'asc' }
  });

  console.log(`Total Locations: ${allLocs.length}`);
  const stateCounts: Record<string, number> = {};

  allLocs.forEach(l => {
    const st = l.state || 'EMPTY';
    stateCounts[st] = (stateCounts[st] || 0) + 1;
    console.log(`  • ${l.name} -> State: "${l.state}" | City: "${l.city}" | Country: "${l.country}"`);
  });

  console.log('\nState Breakdown:');
  console.log(stateCounts);
}

inspectStates().catch(console.error);
