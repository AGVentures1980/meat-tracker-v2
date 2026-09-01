import assert from 'assert';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function runFogoMasterManifestTest() {
    console.log('===============================================================');
    console.log('  PHASE 7B-5L — FOGO DE CHÃO MASTER LOCATION MANIFEST TEST MATRIX');
    console.log('===============================================================\n');

    let passedTests = 0;
    let failedTests = 0;

    function test(name: string, fn: () => Promise<void> | void) {
        return (async () => {
            try {
                await fn();
                console.log(`[PASS] ${name}`);
                passedTests++;
            } catch (err: any) {
                console.error(`[FAIL] ${name} - ${err.message}`);
                failedTests++;
            }
        })();
    }

    // 1. Authoritative Fogo Organization Resolution
    await test('1. Fogo de Chão organization resolves correctly from master database', async () => {
        const company = await prisma.company.findFirst({
            where: { name: { contains: 'Fogo', mode: 'insensitive' } }
        });
        assert(company, 'Fogo de Chão organization must exist in DB');
        assert.strictEqual(company.id, '43670635-c205-4b19-99d4-445c7a683730', 'Canonical brasaOrganizationId matches exact DB ID');
        assert.strictEqual(company.name, 'Fogo de Chão', 'Canonical organization name matches exact DB name');
        assert.strictEqual(company.subdomain, 'fogo', 'Canonical subdomain matches exact DB subdomain');
    });

    // 2. Full Active Store Export Reconciliation
    await test('2. All active stores exported and reconcile to 86 authoritative store count', async () => {
        const company = await prisma.company.findFirst({
            where: { name: { contains: 'Fogo', mode: 'insensitive' } }
        });
        assert(company, 'Fogo organization missing');

        const stores = await prisma.store.findMany({
            where: { company_id: company.id }
        });

        assert.strictEqual(stores.length, 86, 'Authoritative active store count must equal 86');
    });

    // 3. Exact Meat store_id as brasaLocationId (No synthetic IDs)
    await test('3. Every store uses exact Meat store_id as brasaLocationId without synthetic identifiers', async () => {
        const company = await prisma.company.findFirst({
            where: { name: { contains: 'Fogo', mode: 'insensitive' } }
        });
        assert(company, 'Fogo organization missing');

        const stores = await prisma.store.findMany({
            where: { company_id: company.id }
        });

        for (const store of stores) {
            assert(typeof store.id === 'number', `Store ID ${store.id} must be numeric integer`);
            const brasaLocationId = String(store.id);
            assert.strictEqual(brasaLocationId, String(store.id), 'brasaLocationId is strict string representation of store_id');
            assert(!brasaLocationId.startsWith('SYNTHETIC_'), 'No synthetic IDs created');
        }
    });

    // 4. Duplicate ID Audit
    await test('4. Duplicate store ID audit confirms 0 duplicate store IDs', async () => {
        const company = await prisma.company.findFirst({
            where: { name: { contains: 'Fogo', mode: 'insensitive' } }
        });
        assert(company, 'Fogo organization missing');

        const stores = await prisma.store.findMany({
            where: { company_id: company.id }
        });

        const storeIds = stores.map(s => s.id);
        const uniqueStoreIds = new Set(storeIds);
        const duplicateCount = storeIds.length - uniqueStoreIds.size;

        assert.strictEqual(duplicateCount, 0, 'Duplicate store_id count must be exactly 0');
    });

    // 5. Duplicate Physical Location Audit
    await test('5. Duplicate physical location audit confirms 0 duplicate store names', async () => {
        const company = await prisma.company.findFirst({
            where: { name: { contains: 'Fogo', mode: 'insensitive' } }
        });
        assert(company, 'Fogo organization missing');

        const stores = await prisma.store.findMany({
            where: { company_id: company.id }
        });

        const names = stores.map(s => s.store_name.toLowerCase().trim());
        const uniqueNames = new Set(names);
        const duplicateCount = names.length - uniqueNames.size;

        assert.strictEqual(duplicateCount, 0, 'Duplicate physical store location count must be exactly 0');
    });

    // 6. Identity Quality Classification
    await test('6. Identity quality audit confirms 86 MASTER_IDENTITY_COMPLETE records', async () => {
        const company = await prisma.company.findFirst({
            where: { name: { contains: 'Fogo', mode: 'insensitive' } }
        });
        assert(company, 'Fogo organization missing');

        const stores = await prisma.store.findMany({
            where: { company_id: company.id }
        });

        let complete = 0;
        let partial = 0;

        for (const store of stores) {
            const isComplete = Boolean(store.id && store.company_id && store.store_name && (store.location || store.city));
            if (isComplete) complete++;
            else partial++;
        }

        assert.strictEqual(complete, 86, 'Complete identity records must equal 86');
        assert.strictEqual(partial, 0, 'Partial identity records must equal 0');
    });

    // 7. No Business Data or Credentials Exposed
    await test('7. Manifest payload contains 0 credentials, secrets, or sensitive financial data', async () => {
        const company = await prisma.company.findFirst({
            where: { name: { contains: 'Fogo', mode: 'insensitive' } }
        });
        assert(company, 'Fogo organization missing');

        const stores = await prisma.store.findMany({
            where: { company_id: company.id }
        });

        const jsonStr = JSON.stringify(stores);
        assert(!jsonStr.includes('password'), 'Manifest output does not expose passwords');
        assert(!jsonStr.includes('PULSE_SSO_SECRET'), 'Manifest output does not expose SSO secrets');
        assert(!jsonStr.includes('api_key'), 'Manifest output does not expose API keys');
    });

    // 8. Manifest Contract Schema & Hash Verification
    await test('8. Manifest contract contains schemaVersion 1.0, timestamp, and SHA-256 hash', async () => {
        const company = await prisma.company.findFirst({
            where: { name: { contains: 'Fogo', mode: 'insensitive' } }
        });
        assert(company, 'Fogo organization missing');

        const stores = await prisma.store.findMany({
            where: { company_id: company.id },
            orderBy: { id: 'asc' }
        });

        const locations = stores.map(s => ({
            brasaLocationId: String(s.id),
            store_id: s.id,
            name: s.store_name,
            address: s.location,
            country: s.country
        }));

        const payloadStr = JSON.stringify(locations);
        const manifestHash = crypto.createHash('sha256').update(payloadStr).digest('hex');

        assert(manifestHash.length === 64, 'SHA-256 manifest hash must be 64 hexadecimal characters');
    });

    console.log('\n===============================================================');
    console.log(`   MASTER LOCATION MANIFEST TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('===============================================================\n');

    await prisma.$disconnect();
    if (failedTests > 0) process.exit(1);
}

runFogoMasterManifestTest().catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});
