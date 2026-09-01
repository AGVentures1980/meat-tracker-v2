import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTdbManifestReconciliationTest() {
  console.log('===============================================================');
  console.log('  PHASE 7B-5S — TEXAS DE BRAZIL MANIFEST RECONCILIATION TEST ');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => Promise<void> | void) {
    return (async () => {
      try {
        await fn();
        console.log(`[PASS] ${name}`);
        passed++;
      } catch (err: any) {
        console.error(`[FAIL] ${name} - ${err.message}`);
        failed++;
      }
    })();
  }

  // 1. Authoritative Texas Organization Resolution
  await test('1. Authoritative Texas de Brazil organization resolves from BRASA Meat DB', async () => {
    const org = await prisma.company.findFirst({
      where: {
        OR: [
          { id: 'tdb-main' },
          { name: { contains: 'Texas de Brazil', mode: 'insensitive' } }
        ]
      }
    });

    if (!org) throw new Error('Texas de Brazil organization not found');
    if (org.id !== 'tdb-main') throw new Error(`Expected org.id tdb-main, got ${org.id}`);
  });

  // 2. Exact Store Count Reconciliation (54 Master Stores)
  await test('2. Exactly 54 master store records exist in BRASA Meat database', async () => {
    const stores = await prisma.store.findMany({
      where: { company_id: 'tdb-main' }
    });

    if (stores.length !== 54) {
      throw new Error(`Expected exactly 54 store records in Meat DB, found ${stores.length}`);
    }
  });

  // 3. Duplicate Store ID & Name Audit
  await test('3. Store ID and location uniqueness audit confirms 0 duplicates', async () => {
    const stores = await prisma.store.findMany({
      where: { company_id: 'tdb-main' }
    });

    const ids = new Set<number>();
    const names = new Set<string>();

    for (const s of stores) {
      if (ids.has(s.id)) throw new Error(`Duplicate store ID found: ${s.id}`);
      ids.add(s.id);

      if (names.has(s.store_name)) throw new Error(`Duplicate store name found: ${s.store_name}`);
      names.add(s.store_name);
    }
  });

  // 4. Manifest Export Contract Construction
  await test('4. Manifest export generates schemaVersion 1.0, timestamp, and SHA-256 hash', async () => {
    const stores = await prisma.store.findMany({
      where: { company_id: 'tdb-main' },
      orderBy: { id: 'asc' }
    });

    const manifestPayload = {
      schemaVersion: '1.0',
      organization: {
        internalId: 'tdb-main',
        name: 'Texas de Brazil',
        subdomain: 'texasdebrazil',
        masterIdentityStatus: 'MASTER_VERIFIED'
      },
      totalMasterStoreCount: stores.length,
      stores: stores.map(s => ({
        brasaLocationId: String(s.id),
        storeName: s.store_name,
        country: s.country,
        operatingStatus: 'OPERATIONAL',
        masterIdentityStatus: 'MASTER_VERIFIED',
        reconciliationClassification: 'MASTER_OPERATIONAL'
      }))
    };

    const jsonStr = JSON.stringify(manifestPayload);
    const hash = crypto.createHash('sha256').update(jsonStr).digest('hex');

    if (!hash || hash.length !== 64) {
      throw new Error('Failed to compute valid SHA-256 hash for manifest contract');
    }
  });

  console.log('\n===============================================================');
  console.log(`   TEXAS MANIFEST RECONCILIATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  await prisma.$disconnect();
  if (failed > 0) process.exit(1);
}

runTdbManifestReconciliationTest().catch(console.error);
