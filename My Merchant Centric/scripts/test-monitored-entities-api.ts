import { db } from '../src/lib/db';
import { getMonitoredEntities } from '../src/lib/services/monitoredEntityService';

async function testMonitoredEntities() {
  const admin = await db.user.findUnique({
    where: { email: 'admin@brasabrandpulse.com' }
  });

  if (!admin) throw new Error('Admin not found');

  console.log(`Fetching monitored entities for org: ${admin.organizationId}`);

  const entities = await getMonitoredEntities(admin.organizationId);

  console.log(`Total Monitored Entities returned: ${entities.length}`);
  const owned = entities.filter(e => e.entityType === 'OWNED_LOCATION');
  console.log(`Owned Locations count: ${owned.length}`);

  console.log('\nFirst 10 Owned Locations:');
  owned.slice(0, 10).forEach(e => {
    console.log(`  • ${e.locationName} (${e.city}, ${e.state}) - ID: ${e.id}`);
  });
}

testMonitoredEntities().catch(console.error);
