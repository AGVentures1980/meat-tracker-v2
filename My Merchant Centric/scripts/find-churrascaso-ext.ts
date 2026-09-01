import { db } from '../src/lib/db';

async function findChurrascaso() {
  const compLocs = await db.competitorLocation.findMany({
    where: { name: { contains: 'Churrascaso' } },
    include: { externalSources: true, setMembers: true }
  });

  console.log('Found Churrascaso locations:');
  compLocs.forEach(c => {
    console.log(`• Name: "${c.name}", ID: ${c.id}`);
    c.externalSources.forEach(e => console.log(`  - Place ID: ${e.externalLocationId}`));
    c.setMembers.forEach(m => console.log(`  - Member ID: ${m.id}, Role: ${m.competitiveRole}, Status: ${m.status}`));
  });
}

findChurrascaso().catch(console.error);
