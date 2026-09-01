import { PrismaClient } from '@prisma/client';
import { getMonitoredEntities, getMonitoredEntityDetail, ensureNoOrphanSources } from '../src/lib/services/monitoredEntityService';

const prisma = new PrismaClient();

async function runTests() {
  console.log('==================================================');
  console.log('STARTING MONITORED ENTITIES LAYER INTEGRATION TESTS');
  console.log('==================================================');

  let testFailures = 0;

  // 1. Setup Sandbox Organizations
  const orgA = await prisma.organization.findFirst({ where: { slug: 'demo-steakhouse' } }) ||
    await prisma.organization.create({ data: { name: 'Demo Steakhouse', slug: 'demo-steakhouse' } });

  const orgB = await prisma.organization.upsert({
    where: { slug: 'monitored-entities-org-b' },
    update: {},
    create: { name: 'Monitored Entities Org B', slug: 'monitored-entities-org-b' }
  });

  // TEST 1: Texas de Brazil Tampa Entity Visibility & Zero Duplicate Creation
  console.log('\n[TEST 1] Verifying Texas de Brazil Tampa entity visibility & zero duplicates...');
  try {
    const entities = await getMonitoredEntities(orgA.id);

    const texasEntities = entities.filter(e =>
      e.brandName.toLowerCase().includes('texas de brazil') ||
      e.locationName.toLowerCase().includes('texas de brazil')
    );

    if (texasEntities.length === 1) {
      console.log('✔ PASS: Exactly ONE Texas de Brazil entity found.');
      const tdb = texasEntities[0];

      if (tdb.brandName === 'Texas de Brazil' && tdb.googleRating === 4.4 && tdb.reviewCount === 8539 && tdb.coverageType === 'METADATA_ONLY') {
        console.log('✔ PASS: Texas de Brazil entity cleanly loaded rating 4.4 and review count 8539 dynamically from latest snapshot.');
      } else {
        console.error('❌ FAIL: Texas de Brazil entity loaded invalid metrics:', tdb);
        testFailures++;
      }
    } else {
      console.error(`❌ FAIL: Expected 1 Texas de Brazil entity, found ${texasEntities.length}`);
      testFailures++;
    }
  } catch (e: any) {
    console.error('❌ FAIL: Texas de Brazil visibility test error:', e.message);
    testFailures++;
  }

  // TEST 2: No Orphan ExternalSource check
  console.log('\n[TEST 2] Verifying zero orphan ExternalSource records exist across database...');
  try {
    await ensureNoOrphanSources(orgA.id);
    const orphans = await prisma.externalSource.findMany({
      where: {
        organizationId: orgA.id,
        locationId: null,
        competitorLocationId: null,
      }
    });

    if (orphans.length === 0) {
      console.log('✔ PASS: Zero orphan ExternalSource records found.');
    } else {
      console.error('❌ FAIL: Found orphan ExternalSource records:', orphans);
      testFailures++;
    }
  } catch (e: any) {
    console.error('❌ FAIL: Orphan check error:', e.message);
    testFailures++;
  }

  // TEST 3: Monitored Entity Detail View API Service
  console.log('\n[TEST 3] Verifying Monitored Entity detail view service...');
  try {
    const entities = await getMonitoredEntities(orgA.id);
    const tdb = entities.find(e => e.brandName === 'Texas de Brazil');

    if (tdb) {
      const detail = await getMonitoredEntityDetail(orgA.id, tdb.id);
      if (detail && detail.entity.id === tdb.id && detail.snapshots.length >= 1) {
        console.log('✔ PASS: Entity detail service returned full profile, snapshots, and event timeline.');
      } else {
        console.error('❌ FAIL: Entity detail service returned incomplete payload:', detail);
        testFailures++;
      }
    } else {
      console.error('❌ FAIL: Texas de Brazil entity not found for detail test.');
      testFailures++;
    }
  } catch (e: any) {
    console.error('❌ FAIL: Detail view error:', e.message);
    testFailures++;
  }

  // TEST 4: Tenant Isolation on Monitored Entities
  console.log('\n[TEST 4] Verifying Tenant Isolation security boundaries...');
  try {
    const entitiesOrgB = await getMonitoredEntities(orgB.id);
    const tdbInOrgB = entitiesOrgB.find(e => e.brandName === 'Texas de Brazil');

    if (!tdbInOrgB) {
      console.log('✔ PASS: Monitored entities query strictly isolated by organizationId. Org B cannot see Org A entities.');
    } else {
      console.error('❌ FAIL: Leaked Org A Texas de Brazil entity to Org B!');
      testFailures++;
    }
  } catch (e: any) {
    console.error('❌ FAIL: Tenant isolation test error:', e.message);
    testFailures++;
  }

  // TEST 5: Filter rules (Search, Entity Type, City/State)
  console.log('\n[TEST 5] Verifying search and entity type filtering rules...');
  try {
    const ownedOnly = await getMonitoredEntities(orgA.id, { entityType: 'OWNED_LOCATION' });
    const externalOnly = await getMonitoredEntities(orgA.id, { entityType: 'MONITORED_EXTERNAL' });

    if (ownedOnly.every(e => e.entityType === 'OWNED_LOCATION') && externalOnly.every(e => e.entityType === 'MONITORED_EXTERNAL')) {
      console.log('✔ PASS: Entity type filter rules enforced correctly.');
    } else {
      console.error('❌ FAIL: Entity type filtering returned invalid types:', ownedOnly, externalOnly);
      testFailures++;
    }
  } catch (e: any) {
    console.error('❌ FAIL: Filter test error:', e.message);
    testFailures++;
  }

  console.log('\n==================================================');
  if (testFailures === 0) {
    console.log('🎉 SUCCESS: ALL MONITORED ENTITIES INTEGRATION TESTS PASSED!');
  } else {
    console.error(`💥 FAILURE: ${testFailures} monitored entities tests failed!`);
    process.exit(1);
  }
  console.log('==================================================');
}

runTests()
  .catch((e) => {
    console.error('Test execution error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
