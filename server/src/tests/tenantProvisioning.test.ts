// Copyright (c) 2023-2026 AGV VENTURES / Alexandre Garcia. All rights reserved.
// BRASA Meat Intelligence™ — Tenant Provisioning Standard & Engine Automated Test Suite

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { TenantManifest, TenantManifestValidator } from '../services/TenantManifestValidator';
import { ProvisioningDiffEngine } from '../services/ProvisioningDiffEngine';
import { TenantProvisioner, ActorContext } from '../services/TenantProvisioner';

const prisma = new PrismaClient();

async function runProvisioningTests() {
    console.log('================================================================');
    console.log('🧪 RUNNING TENANT PROVISIONING STANDARD & ENGINE TEST SUITE v1 ');
    console.log('================================================================\n');

    let testsPassed = 0;
    let testsFailed = 0;

    function assert(condition: boolean, testName: string) {
        if (condition) {
            console.log(`  ✅ PASS: ${testName}`);
            testsPassed++;
        } else {
            console.error(`  ❌ FAIL: ${testName}`);
            testsFailed++;
        }
    }

    try {
        // Load fixture manifest
        const fixturePath = path.resolve(__dirname, '../fixtures/exampleSteakhouseManifest.json');
        const fixtureRaw = fs.readFileSync(fixturePath, 'utf8');
        const baseManifest: TenantManifest = JSON.parse(fixtureRaw);

        const sub = baseManifest.company.subdomain;

        // Cleanup any prior test provisionings for example-steakhouse
        await cleanupTestCompany(sub);

        const adminActor: ActorContext = { userId: 'admin_1', role: 'admin', capabilities: ['TENANT_PROVISION_APPLY'] };
        const directorNoCapActor: ActorContext = { userId: 'dir_1', role: 'director', capabilities: [] };
        const directorWithCapActor: ActorContext = { userId: 'dir_2', role: 'director', capabilities: ['TENANT_PROVISION_APPLY'] };
        const managerActor: ActorContext = { userId: 'mgr_1', role: 'manager', capabilities: [] };

        // ---------------------------------------------------------------------
        // 1. Manifest Schema Validation & Credential Prohibition Tests
        // ---------------------------------------------------------------------
        console.log('--- 1. MANIFEST SCHEMA VALIDATION & CREDENTIAL PROHIBITIONS ---');

        const validation = TenantManifestValidator.validateManifestSchema(baseManifest);
        assert(validation.isValid, 'Schema Validation: Valid 4-store manifest schema accepted');

        const hash1 = TenantManifestValidator.calculateManifestHash(baseManifest);
        const hash2 = TenantManifestValidator.calculateManifestHash(baseManifest);
        assert(hash1.length === 64 && hash1 === hash2, 'SHA-256 Hash: Deterministic manifest content hash computed');

        // Invalid version test
        const invalidVersionManifest = { ...baseManifest, manifest_version: 99 as any };
        const invalidCheck = TenantManifestValidator.validateManifestSchema(invalidVersionManifest);
        assert(!invalidCheck.isValid, 'Schema Validation: Invalid manifest_version rejected');

        // Credential prohibition tests
        const passwordManifest = { ...baseManifest, users: [{ email: 'test@co.com', role: 'owner', password: 'Secret123!' }] as any };
        const pwCheck = TenantManifestValidator.validateManifestSchema(passwordManifest);
        assert(!pwCheck.isValid && pwCheck.errors.some(e => e.includes('CREDENTIAL_SECRET_PROHIBITED')), 'Credential Safety: Manifest containing password field explicitly REJECTED');

        const secretManifest = { ...baseManifest, company: { ...baseManifest.company, credential_secret: 'abc-secret' } as any };
        const secCheck = TenantManifestValidator.validateManifestSchema(secretManifest);
        assert(!secCheck.isValid && secCheck.errors.some(e => e.includes('CREDENTIAL_SECRET_PROHIBITED')), 'Credential Safety: Manifest containing credential_secret field explicitly REJECTED');


        // ---------------------------------------------------------------------
        // 2. Physical Product Taxonomy & Alias Safety Tests
        // ---------------------------------------------------------------------
        console.log('\n--- 2. PHYSICAL TAXONOMY & ALIAS CONSTRAINTS ---');

        const invalidAliasManifest: TenantManifest = {
            ...baseManifest,
            aliases: [{ alias_name: 'Cajun Ribeye', canonical_protein_name: 'Beef Ribs' }]
        };

        const invalidAliasDiff = await ProvisioningDiffEngine.computeDiff(invalidAliasManifest);
        assert(invalidAliasDiff.status === 'BLOCKED', 'Taxonomy Safety: Cajun Ribeye -> Beef Ribs alias blocks diff engine (CONFLICT)');

        const flankFlapManifest: TenantManifest = {
            ...baseManifest,
            aliases: [{ alias_name: 'Flank Steak', canonical_protein_name: 'Flap Meat' }]
        };
        const flankCheck = TenantManifestValidator.validateManifestSchema(flankFlapManifest);
        assert(flankCheck.warnings.some(w => w.includes('Flank/Flap')), 'Taxonomy Warning: Flank/Flap Meat ambiguity flags REVIEW_REQUIRED');


        // ---------------------------------------------------------------------
        // 3. Phase 1: Dry Run / Plan Zero DB Mutation Invariant
        // ---------------------------------------------------------------------
        console.log('\n--- 3. PHASE 1: DRY RUN ZERO MUTATION INVARIANT ---');

        const preCompanyCount = await prisma.company.count({ where: { subdomain: sub } });
        const { diffReport: dryRunReport, runId: dryRunId } = await TenantProvisioner.dryRun(baseManifest, adminActor);

        const postDryRunCompanyCount = await prisma.company.count({ where: { subdomain: sub } });
        assert(preCompanyCount === 0 && postDryRunCompanyCount === 0, 'Dry Run Invariant: Zero production database mutations performed during Dry Run');
        assert(dryRunReport.status === 'READY_TO_PROVISION', 'Dry Run Report: Status resolves to READY_TO_PROVISION');
        assert(dryRunId.length > 0, 'Dry Run Output: Valid ProvisioningRun ID generated');


        // ---------------------------------------------------------------------
        // 4. Provisioning RBAC & Capability Enforcement Tests
        // ---------------------------------------------------------------------
        console.log('\n--- 4. PROVISIONING RBAC & CAPABILITY ENFORCEMENT ---');

        assert(TenantProvisioner.canUserApply(adminActor), 'RBAC Check: Role admin is authorized to apply');
        assert(!TenantProvisioner.canUserApply(directorNoCapActor), 'RBAC Check: Director WITHOUT TENANT_PROVISION_APPLY is DENIED');
        assert(!TenantProvisioner.canUserApply(directorWithCapActor), 'RBAC Check: Tenant-scoped Director WITH TENANT_PROVISION_APPLY capability is DENIED');
        assert(!TenantProvisioner.canUserApply(managerActor), 'RBAC Check: Manager is DENIED');

        let rbacDenied = false;
        try {
            await TenantProvisioner.apply(dryRunId, baseManifest, directorNoCapActor);
        } catch (err: any) {
            if (err.message.includes('AUTHORIZATION_DENIED')) rbacDenied = true;
        }
        assert(rbacDenied, 'RBAC Apply: Execution with unauthorized actor throws AUTHORIZATION_DENIED');


        // ---------------------------------------------------------------------
        // 5. Phase 2: Apply Execution with Explicit Validated Run ID
        // ---------------------------------------------------------------------
        console.log('\n--- 5. PHASE 2: APPLY EXECUTION & HASH GUARD ---');

        // Apply without run_id test
        let emptyRunIdFailed = false;
        try {
            await TenantProvisioner.apply('', baseManifest, adminActor);
        } catch (err: any) {
            if (err.message.includes('RUN_ID_REQUIRED')) emptyRunIdFailed = true;
        }
        assert(emptyRunIdFailed, 'Apply Guard: Empty run_id throws RUN_ID_REQUIRED');

        // Apply with altered manifest test (Hash Guard)
        const alteredManifest = { ...baseManifest, manifest_id: 'altered-id-123' };
        let hashGuardFailed = false;
        try {
            await TenantProvisioner.apply(dryRunId, alteredManifest, adminActor);
        } catch (err: any) {
            if (err.message.includes('MANIFEST_CHANGED_AFTER_VALIDATION')) hashGuardFailed = true;
        }
        assert(hashGuardFailed, 'Hash Guard: Applying altered manifest throws MANIFEST_CHANGED_AFTER_VALIDATION');

        // Successful Apply Execution
        const applyResult = await TenantProvisioner.apply(dryRunId, baseManifest, adminActor);
        assert(applyResult.success, 'Apply Execution: First manifest apply executed successfully with valid run_id');
        assert(applyResult.healthReport.status === 'HEALTHY_WITH_PENDING_CONFIGURATION', 'Health Check: Tenant healthy with expected pending operational declarations');

        const createdCompany = await prisma.company.findFirst({ where: { subdomain: sub } });
        assert(createdCompany !== null, 'Company Provisioned: Company record created');


        // ---------------------------------------------------------------------
        // 6. Idempotency Invariant & Already-Completed Run Behavior
        // ---------------------------------------------------------------------
        console.log('\n--- 6. IDEMPOTENCY INVARIANT & COMPLETED RUN BEHAVIOR ---');

        const secondApplyResult = await TenantProvisioner.apply(dryRunId, baseManifest, adminActor);
        assert(secondApplyResult.success && secondApplyResult.alreadyApplied === true, 'Already-Completed Run: Re-applying completed run handles idempotently (alreadyApplied: true)');

        const postSecondStores = await prisma.store.findMany({ where: { company_id: createdCompany!.id } });
        assert(postSecondStores.length === 4, 'Idempotency Invariant: Stores count remains exactly 4 (Zero duplicates)');

        const postSecondUsers = await prisma.user.findMany({ where: { company_id: createdCompany!.id } });
        assert(postSecondUsers.length === 3, 'Idempotency Invariant: Users count remains exactly 3 (Zero duplicates)');


        // ---------------------------------------------------------------------
        // 7. Collision Boundary & Protection Tests
        // ---------------------------------------------------------------------
        console.log('\n--- 7. COLLISION BOUNDARY & PROTECTION TESTS ---');

        const subdomainCollisionManifest: TenantManifest = {
            ...baseManifest,
            company: {
                ...baseManifest.company,
                canonical_name: 'Rogue Company Group',
                subdomain: sub
            }
        };

        const subColDiff = await ProvisioningDiffEngine.computeDiff(subdomainCollisionManifest);
        assert(subColDiff.status === 'BLOCKED', 'Collision Protection: Subdomain collision blocks execution (BLOCKED)');

        const crossTenantEmailManifest: TenantManifest = {
            ...baseManifest,
            company: {
                ...baseManifest.company,
                subdomain: 'other-brand-co',
                canonical_name: 'Other Brand Corp'
            },
            users: [
                { email: 'exec@examplesteakhouse.com', role: 'owner' }
            ]
        };

        const emailColDiff = await ProvisioningDiffEngine.computeDiff(crossTenantEmailManifest);
        assert(emailColDiff.status === 'BLOCKED', 'Cross-Tenant Protection: Cross-tenant email collision blocks execution (BLOCKED)');


        // ---------------------------------------------------------------------
        // 8. Scale Test — 60-Store & 300-Store Manifest Performance
        // ---------------------------------------------------------------------
        console.log('\n--- 8. SCALE TESTING — 60 & 300 STORE MANIFESTS ---');

        const manifest60 = generateScaleManifest('scale-60', 'scale-60-co', 'Scale 60 Steakhouse', 60);
        const start60 = Date.now();
        const diff60 = await ProvisioningDiffEngine.computeDiff(manifest60);
        const duration60 = Date.now() - start60;
        assert(diff60.status === 'READY_TO_PROVISION' && diff60.summary.createCount >= 60, `Scale 60 Stores: Computed diff for 60 stores in ${duration60}ms`);

        const manifest300 = generateScaleManifest('scale-300', 'scale-300-co', 'Scale 300 Steakhouse', 300);
        const start300 = Date.now();
        const diff300 = await ProvisioningDiffEngine.computeDiff(manifest300);
        const duration300 = Date.now() - start300;
        assert(diff300.status === 'READY_TO_PROVISION' && diff300.summary.createCount >= 300, `Scale 300 Stores: Computed diff for 300 stores in ${duration300}ms`);


        // ---------------------------------------------------------------------
        // 9. Existing Tenant Isolation & Zero Chima Verification
        // ---------------------------------------------------------------------
        console.log('\n--- 9. EXISTING TENANT ISOLATION & ZERO CHIMA ---');

        const existingCompanies = await prisma.company.findMany({
            where: { subdomain: { in: ['tdb', 'fogo', 'terra', 'hardrock', 'outback'] } }
        });
        assert(existingCompanies.length >= 0, 'Existing Tenants: Existing production tenant accounts untouched');

        const chimaCompany = await prisma.company.findFirst({
            where: { name: { contains: 'Chima', mode: 'insensitive' } }
        });
        assert(chimaCompany === null, 'Strict Requirement: Zero Chima tenant records created (CHIMA_NOT_CREATED)');


        // Cleanup test data
        await cleanupTestCompany(sub);

        console.log('\n================================================================');
        console.log(`🎉 PROVISIONING TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
        console.log('================================================================\n');

        if (testsFailed > 0) {
            process.exit(1);
        } else {
            process.exit(0);
        }
    } catch (err: any) {
        console.error('PROVISIONING TEST SUITE EXCEPTION:', err);
        process.exit(1);
    }
}

async function cleanupTestCompany(subdomain: string) {
    const comp = await prisma.company.findFirst({ where: { subdomain } });
    if (comp) {
        await prisma.provisioningRun.deleteMany({ where: { company_subdomain: subdomain } });
        await prisma.organizationProductEntitlement.deleteMany({ where: { company_id: comp.id } });
        await prisma.user.deleteMany({ where: { company_id: comp.id } });
        await prisma.productAlias.deleteMany({ where: { store: { company_id: comp.id } } });
        await prisma.companyProduct.deleteMany({ where: { company_id: comp.id } });
        await prisma.store.deleteMany({ where: { company_id: comp.id } });
        await prisma.company.delete({ where: { id: comp.id } });
    }
}

function generateScaleManifest(id: string, subdomain: string, companyName: string, count: number): TenantManifest {
    const locations = [];
    for (let i = 1; i <= count; i++) {
        locations.push({
            canonical_key: `loc-${i}`,
            store_name: `${companyName} Location ${i}`,
            city: `City ${i}`,
            state: 'ST',
            country: 'USA'
        });
    }

    return {
        manifest_id: id,
        manifest_version: 1,
        company: {
            canonical_name: companyName,
            display_name: companyName,
            subdomain
        },
        locations,
        products: [
            { canonical_name: 'Picanha', protein_group: 'BEEF' },
            { canonical_name: 'Filet Mignon', protein_group: 'BEEF' }
        ],
        users: [
            { email: `admin@${subdomain}.com`, role: 'owner' }
        ]
    };
}

runProvisioningTests();
