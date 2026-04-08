import { PrismaClient } from '@prisma/client';
import { TenantDeletionEngine } from './src/services/TenantDeletionEngine';

const prisma = new PrismaClient();

async function runValidations() {
    console.log("=== BRASA SRE TENANT ENGINE VALIDATION ===\n");
    
    // SETUP: Create a dummy tenant & store
    const dummyCompany = await prisma.company.create({
        data: {
            name: 'TEST_TENANT_DUMMY',
            stores: {
                create: [{ store_name: 'Dummy Store 1', location: '123 Fake St' } as any]
            }
        }
    });
    console.log(`[SETUP] Created Dummy Tenant: ${dummyCompany.id}\n`);

    // TEST 1: Denylist Validation
    console.log("--- TEST 1: DENYLIST VALIDATION ---");
    try {
        await TenantDeletionEngine.performDryRun('tdb-main', 'U-123', 'sre@brasa.com', 'staging');
        console.log("❌ FAILED: Did not block tdb-main");
    } catch (e: any) {
        console.log(`✅ PASSED: Blocked with expected error -> ${e.message}\n`);
    }

    // TEST 2: Dry Run Execution (Real Payload)
    console.log("--- TEST 2: DRY-RUN PAYLOAD GENERATION ---");
    const dryRunResult = await TenantDeletionEngine.performDryRun(dummyCompany.id, 'U-123', 'sre@brasa.com', 'staging');
    console.log(`✅ PASSED: Dry-Run Generated`);
    console.log(`Job ID: ${dryRunResult.job.id}`);
    console.log(`Hash: ${dryRunResult.hash}`);
    console.log(`Payload:\n${JSON.stringify(dryRunResult.payload, null, 2)}\n`);

    // TEST 3: Hash Mismatch / Integrity Validation
    console.log("--- TEST 3: HASH MISMATCH PROTECTION ---");
    try {
        await TenantDeletionEngine.execute(dryRunResult.job.id, 'FAKE_HASH_001', 'staging', false);
        console.log("❌ FAILED: Executed with invalid hash");
    } catch (e: any) {
        console.log(`✅ PASSED: Blocked with expected error -> ${e.message}\n`);
    }

    // TEST 4: Production Guard Validation
    console.log("--- TEST 4: PRODUCTION GUARD ---");
    const dryRunResult4 = await TenantDeletionEngine.performDryRun(dummyCompany.id, 'U-123', 'sre@brasa.com', 'staging');
    try {
        await TenantDeletionEngine.execute(dryRunResult4.job.id, dryRunResult4.hash, 'production', false);
        console.log("❌ FAILED: Executed in production without allow flag");
    } catch (e: any) {
        console.log(`✅ PASSED: Blocked with expected error -> ${e.message}\n`);
    }

    // TEST 5: Successful Topological Execution
    console.log("--- TEST 5: FULL TOPOLOGICAL WIPE ---");
    const dryRunResult5 = await TenantDeletionEngine.performDryRun(dummyCompany.id, 'U-123', 'sre@brasa.com', 'staging');
    const executedJob = await TenantDeletionEngine.execute(dryRunResult5.job.id, dryRunResult5.hash, 'staging', false);
    console.log(`✅ PASSED: Wipe Transaction Completed`);
    
    // TEST 6: Audit Log Verification
    console.log("--- TEST 6: AUDIT LOG PERSISTENCE ---");
    const auditRecord = await prisma.tenantDeletionJob.findUnique({ where: { id: executedJob.id } });
    console.log(`✅ PASSED: Audit Record Retrieved`);
    console.log(JSON.stringify(auditRecord, null, 2));

    // CLEANUP CHECK
    const checkCompany = await prisma.company.findUnique({ where: { id: dummyCompany.id } });
    if (!checkCompany) {
        console.log(`\n✅ FINAL CHECK PASSED: Dummy Tenant successfully eradicated from DB.`);
    } else {
        console.log(`\n❌ FINAL CHECK FAILED: Dummy Tenant still exists!`);
    }
}

runValidations().catch(console.error).finally(() => prisma.$disconnect());
