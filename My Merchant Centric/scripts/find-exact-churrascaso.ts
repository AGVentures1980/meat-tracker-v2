import { db } from '../src/lib/db';

async function findExactChurrascaso() {
  const sources = await db.externalSource.findMany({
    where: { competitorLocation: { name: { contains: 'Churrascaso' } } },
    include: { competitorLocation: true }
  });

  console.log('All Churrascaso external sources in DB:');
  sources.forEach(s => {
    console.log(`• Name: "${s.competitorLocation?.name}", Place ID: ${s.externalLocationId}, ID: ${s.competitorLocationId}`);
  });
}

findExactChurrascaso().catch(console.error);
