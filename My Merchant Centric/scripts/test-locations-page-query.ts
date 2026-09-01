import { db } from '../src/lib/db';

async function testLocationsQuery() {
  const admin = await db.user.findUnique({
    where: { email: 'admin@brasabrandpulse.com' }
  });

  if (!admin) throw new Error('Admin user not found');

  const organizationId = admin.organizationId;
  console.log(`Querying locations for org: ${organizationId}`);

  const allLocations = await db.location.findMany({
    where: {
      organizationId,
      status: 'ACTIVE',
      provenanceMode: { in: ['LIVE', 'IMPORTED'] },
    },
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      status: true,
      businessStatus: true,
      provenanceMode: true,
      organizationId: true
    },
    orderBy: { name: 'asc' },
  });

  console.log(`Prisma returned ${allLocations.length} locations!`);
  console.log('Locations list:');
  allLocations.forEach((l, i) => console.log(`  ${i + 1}. ${l.name} (${l.city}, ${l.state}) - ID: ${l.id}`));
}

testLocationsQuery().catch(console.error);
