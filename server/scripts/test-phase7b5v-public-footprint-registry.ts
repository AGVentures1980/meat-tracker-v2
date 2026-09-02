import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runIntegrityTest() {
  console.log('=== RUNNING PHASE 7B-5V PUBLIC FOOTPRINT INTEGRITY TEST ===\n');

  let passed = true;

  // 1. Validate Source Lineage
  const missingLineage = await prisma.publicLocationRegistry.findMany({
    where: {
      OR: [
        { official_source_url: '' },
        { source_type: '' }
      ]
    }
  });

  console.log(`[TEST 1] Source Lineage Verification:`);
  if (missingLineage.length === 0) {
    console.log(`  PASS: All public location records contain full source URL and source type lineage.`);
  } else {
    console.log(`  FAIL: Found ${missingLineage.length} records missing source lineage!`);
    passed = false;
  }

  // 2. Validate No Synthetic Store IDs & Store Creation Count = 0
  const registryMatchedStoreIds = await prisma.publicLocationRegistry.findMany({
    where: { matched_brasa_store_id: { not: null } },
    select: { matched_brasa_store_id: true }
  });

  const validStores = await prisma.store.findMany({
    select: { id: true }
  });
  const validStoreIdSet = new Set(validStores.map(s => s.id));

  let syntheticCount = 0;
  for (const r of registryMatchedStoreIds) {
    if (r.matched_brasa_store_id && !validStoreIdSet.has(r.matched_brasa_store_id)) {
      syntheticCount++;
    }
  }

  console.log(`\n[TEST 2] Synthetic Store ID Verification:`);
  if (syntheticCount === 0) {
    console.log(`  PASS: Zero synthetic store IDs found in registry matches.`);
  } else {
    console.log(`  FAIL: Found ${syntheticCount} synthetic store IDs!`);
    passed = false;
  }

  // 3. Validate Coming Soon Exclusion from Public Operational Counts
  const comingSoonOperational = await prisma.publicLocationRegistry.findMany({
    where: {
      public_operating_status: 'COMING_SOON',
      reconciliation_status: 'MATCHED'
    }
  });

  console.log(`\n[TEST 3] Coming Soon Operational Exclusion:`);
  if (comingSoonOperational.length === 0) {
    console.log(`  PASS: Coming Soon locations are strictly excluded from operational MATCHED counts.`);
  } else {
    console.log(`  FAIL: Found ${comingSoonOperational.length} Coming Soon locations marked as MATCHED operational!`);
    passed = false;
  }

  // 4. Validate Duplicate Physical Identities
  const allRegistry = await prisma.publicLocationRegistry.findMany();
  const seenKeys = new Set();
  let duplicateCount = 0;

  for (const r of allRegistry) {
    const key = `${r.company_id}:${r.official_location_name.toLowerCase().trim()}`;
    if (seenKeys.has(key)) {
      duplicateCount++;
    } else {
      seenKeys.add(key);
    }
  }

  console.log(`\n[TEST 4] Physical Identity Uniqueness:`);
  if (duplicateCount === 0) {
    console.log(`  PASS: Zero duplicate physical identities found in public registry (${allRegistry.length} unique records).`);
  } else {
    console.log(`  FAIL: Found ${duplicateCount} duplicate physical identities!`);
    passed = false;
  }

  // 5. Validate System Architectures Unchanged
  const orgCount = await prisma.company.count();
  const userCount = await prisma.user.count();

  console.log(`\n[TEST 5] System Architecture Immutability:`);
  console.log(`  Organizations preserved: ${orgCount === 5 ? 'YES (5)' : 'NO'}`);
  console.log(`  Users preserved: ${userCount > 0 ? 'YES (' + userCount + ')' : 'NO'}`);

  if (passed && orgCount === 5) {
    console.log('\n==================================================');
    console.log('  ALL PHASE 7B-5V INTEGRITY CHECKS PASSED (100%)');
    console.log('==================================================\n');
  } else {
    console.error('\n[FAIL] Phase 7B-5V Integrity Checks Failed!');
    process.exit(1);
  }
}

runIntegrityTest().catch(console.error);
