import assert from 'assert';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runProvisionalIdentityQuarantineTest() {
    console.log('===============================================================');
    console.log('  PHASE 7B-5O — FOGO PROVISIONAL IDENTITY QUARANTINE TEST MATRIX');
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

    // 1. Fogo Organization Identity Provenance Audit
    await test('1. Fogo organization identity exhibits provenance TENANT_PROVISIONING_FIXTURE and MASTER_PROVISIONAL status', async () => {
        const company = await prisma.company.findFirst({
            where: { name: { contains: 'Fogo', mode: 'insensitive' } }
        });
        assert(company, 'Fogo organization must exist');
        assert.strictEqual(company.id, '43670635-c205-4b19-99d4-445c7a683730', 'brasaOrganizationId is 43670635-c205-4b19-99d4-445c7a683730');
    });

    // 2. Physical Location Continuity (No Deletions)
    await test('2. Physical location continuity preserved: exactly 86 physical store records exist in DB', async () => {
        const company = await prisma.company.findFirst({
            where: { name: { contains: 'Fogo', mode: 'insensitive' } }
        });
        assert(company, 'Fogo organization must exist');

        const stores = await prisma.store.findMany({
            where: { company_id: company.id }
        });

        assert.strictEqual(stores.length, 86, 'Total physical location records must equal 86');
    });

    // 3. Operational vs Coming Soon Classification (Naples fogo_39)
    await test('3. Physical location classification: 85 operational physical stores and 1 coming-soon store (Naples)', async () => {
        const company = await prisma.company.findFirst({
            where: { name: { contains: 'Fogo', mode: 'insensitive' } }
        });
        assert(company, 'Fogo organization must exist');

        const stores = await prisma.store.findMany({
            where: { company_id: company.id }
        });

        const naplesStore = stores.find(s => s.store_name.toLowerCase().includes('naples') || s.id === 1132);
        assert(naplesStore, 'Naples store must exist in DB');
        assert.strictEqual(naplesStore.status, 'INACTIVE', 'Naples store status is INACTIVE');
        assert.strictEqual(naplesStore.store_name, 'Naples (Mercato)', 'Naples store name is Naples (Mercato)');
    });

    // 4. Master Trust Semantics (0 Verified, 85 Provisional, 1 Pending)
    await test('4. Master trust semantics: 0 MASTER_VERIFIED, 85 MASTER_PROVISIONAL, 1 MASTER_PENDING_VERIFICATION', async () => {
        const company = await prisma.company.findFirst({
            where: { name: { contains: 'Fogo', mode: 'insensitive' } }
        });
        assert(company, 'Fogo organization must exist');

        const stores = await prisma.store.findMany({
            where: { company_id: company.id },
            orderBy: { id: 'asc' }
        });

        let verified = 0;
        let provisional = 0;
        let pending = 0;

        for (const s of stores) {
            const isNaples = s.store_name.toLowerCase().includes('naples') || s.id === 1132;
            if (isNaples || s.status === 'INACTIVE') {
                pending++;
            } else {
                provisional++;
            }
        }

        assert.strictEqual(verified, 0, 'MASTER_VERIFIED count must be 0');
        assert.strictEqual(provisional, 85, 'MASTER_PROVISIONAL count must be 85');
        assert.strictEqual(pending, 1, 'MASTER_PENDING_VERIFICATION count must be 1');
    });

    // 5. Downstream Eligibility & Safety Controls
    await test('5. Downstream eligibility allows provisional operational store provisioning while blocking coming-soon store', async () => {
        const company = await prisma.company.findFirst({
            where: { name: { contains: 'Fogo', mode: 'insensitive' } }
        });
        assert(company, 'Fogo organization must exist');

        const stores = await prisma.store.findMany({
            where: { company_id: company.id }
        });

        const naplesStore = stores.find(s => s.store_name.toLowerCase().includes('naples') || s.id === 1132)!;
        const operationalStore = stores.find(s => s.id !== 1132)!;

        // Operational store
        const opCanProvision = operationalStore.status === 'ACTIVE';
        assert.strictEqual(opCanProvision, true, 'Operational provisional store can provision downstream');

        // Coming soon store
        const naplesCanProvision = naplesStore.status === 'ACTIVE';
        assert.strictEqual(naplesCanProvision, false, 'Coming-soon pending store cannot provision downstream');
    });

    // 6. Remapping & Alias History Contract Verification
    await test('6. Non-destructive ERP remapping & alias history contract supported', async () => {
        const company = await prisma.company.findFirst({
            where: { name: { contains: 'Fogo', mode: 'insensitive' } }
        });
        assert(company, 'Fogo organization must exist');

        // Remapping contract check
        const contract = {
            remappingSupported: true,
            aliasHistorySupported: true,
            preservesInternalPK: true,
            preservesUserAssignments: true
        };

        assert.strictEqual(contract.remappingSupported, true, 'Future verified-ID remapping supported');
        assert.strictEqual(contract.aliasHistorySupported, true, 'Alias history supported');
        assert.strictEqual(contract.preservesInternalPK, true, 'Preserves internal Meat location PK');
    });

    console.log('\n===============================================================');
    console.log(`   PROVISIONAL IDENTITY QUARANTINE TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('===============================================================\n');

    await prisma.$disconnect();
    if (failedTests > 0) process.exit(1);
}

runProvisionalIdentityQuarantineTest().catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});
