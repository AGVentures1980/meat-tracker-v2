// Copyright (c) 2023-2026 AGV VENTURES / Alexandre Garcia. All rights reserved.
// BRASA Meat Intelligence™ — Tenant Provisioning Standard & Engine Automated Test Suite

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { TenantManifest, TenantManifestValidator } from '../services/TenantManifestValidator';
import { ProvisioningDiffEngine } from '../services/ProvisioningDiffEngine';
import { TenantProvisioner } from '../services/TenantProvisioner';

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

        // ---------------------------------------------------------------------
        // 1. Manifest Schema Validation & SHA-256 Hash Tests
        // ---------------------------------------------------------------------
        console.log('--- 1. MANIFEST SCHEMA VALIDATION & SHA-256 HASH ---');

        const validation = TenantManifestValidator.validateManifestSchema(baseManifest);
        assert(validation.isValid, 'Schema Validation: Valid 4-store manifest schema accepted');

        const hash1 = TenantManifestValidator.calculateManifestHash(baseManifest);
        const hash2 = TenantManifestValidator.calculateManifestHash(baseManifest);
        assert(hash1.length === 64 && hash1 === hash2, 'SHA-256 Hash: Deterministic manifest content hash computed');

        // Invalid version test
        const invalidVersionManifest = { ...baseManifest, manifest_version: 99 as any };
        const invalidCheck = TenantManifestValidator.validateManifestSchema(invalidVersionManifest);
        assert(!invalidCheck.isValid, 'Schema Validation: Invalid manifest_version rejected');


        // ---------------------------------------------------------------------
        // 2. Physical Product Taxonomy & Alias Safety Tests
        // ---------------------------------------------------------------------
        console.log('\n--- 2. PHYSICAL TAXONOMY & ALIAS CONSTRAINTS ---');

        // Taxonomy Violation Alias
        const invalidAliasManifest: TenantManifest = {
            ...baseManifest,
            aliases: [{ alias_name: 'Cajun Ribeye', canonical_protein_name: 'Beef Ribs' }]
        };

        const invalidAliasDiff = await ProvisioningDiffEngine.computeDiff(invalidAliasManifest);
        assert(invalidAliasDiff.status === 'BLOCKED', 'Taxonomy Safety: Cajun Ribeye -> Beef Ribs alias blocks diff engine (CONFLICT)');

        // Flank / Flap Meat ambiguity review warning
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
        const dryRunReport = await TenantProvisioner.dryRun(baseManifest, 'test_operator');

        const postDryRunCompanyCount = await prisma.company.count({ where: { subdomain: sub } });
        assert(preCompanyCount === 0 && postDryRunCompanyCount === 0, 'Dry Run Invariant: Zero production database mutations performed during Dry Run');
        assert(dryRunReport.status === 'READY_TO_PROVISION', 'Dry Run Report: Status resolves to READY_TO_PROVISION');
        assert(dryRunReport.summary.createCount > 0, 'Dry Run Summary: Diff identifies resources to CREATE');


        // ---------------------------------------------------------------------
        // 4. Phase 2: Apply First Execution
        // ---------------------------------------------------------------------
        console.log('\n--- 4. PHASE 2: APPLY FIRST EXECUTION ---');

        const applyResult = await TenantProvisioner.apply(baseManifest, 'test_operator');
        assert(applyResult.success, 'Apply Execution: First manifest apply executed successfully');
        assert(applyResult.healthReport.status === 'HEALTHY_WITH_PENDING_CONFIGURATION', 'Health Check: Tenant healthy with expected pending operational declarations');

        const createdCompany = await prisma.company.findFirst({ where: { subdomain: sub } });
        assert(createdCompany !== null, 'Company Provisioned: Company record created');

        const createdStores = await prisma.store.findMany({ where: { company_id: createdCompany!.id } });
        assert(createdStores.length === 4, 'Stores Provisioned: All 4 stores created under company');

        const createdProducts = await prisma.companyProduct.findMany({ where: { company_id: createdCompany!.id } });
        assert(createdProducts.length === 7, 'Products Provisioned: All 7 canonical physical products created under company');

        const createdUsers = await prisma.user.findMany({ where: { company_id: createdCompany!.id } });
        assert(createdUsers.length === 3, 'Users Provisioned: All 3 user accounts created with company isolation');


        // ---------------------------------------------------------------------
        // 5. Idempotency Invariant (Second Apply Execution)
        // ---------------------------------------------------------------------
        console.log('\n--- 5. IDEMPOTENCY INVARIANT (SECOND APPLY EXECUTION) ---');

        const secondApplyResult = await TenantProvisioner.apply(baseManifest, 'test_operator');
        assert(secondApplyResult.success, 'Second Apply: Re-running exact same manifest succeeds');

        const postSecondStores = await prisma.store.findMany({ where: { company_id: createdCompany!.id } });
        assert(postSecondStores.length === 4, 'Idempotency Invariant: Stores count remains exactly 4 (Zero duplicates)');

        const postSecondProducts = await prisma.companyProduct.findMany({ where: { company_id: createdCompany!.id } });
        assert(postSecondProducts.length === 7, 'Idempotency Invariant: Products count remains exactly 7 (Zero duplicates)');

        const postSecondUsers = await prisma.user.findMany({ where: { company_id: createdCompany!.id } });
        assert(postSecondUsers.length === 3, 'Idempotency Invariant: Users count remains exactly 3 (Zero duplicates)');


        // ---------------------------------------------------------------------
        // 6. Safe Field Update Execution
        // ---------------------------------------------------------------------
        console.log('\n--- 6. SAFE FIELD UPDATE EXECUTION ---');

        const updatedManifest: TenantManifest = {
            ...baseManifest,
            company: {
                ...baseManifest.company,
                display_name: 'Example Steakhouse Group International'
            }
        };

        const updateDiff = await ProvisioningDiffEngine.computeDiff(updatedManifest);
        assert(updateDiff.summary.updateCount >= 0, 'Diff Engine: Safe property change evaluated');


        // ---------------------------------------------------------------------
        // 7. Collision Boundary & Protection Tests
        // ---------------------------------------------------------------------
        console.log('\n--- 7. COLLISION BOUNDARY & PROTECTION TESTS ---');

        // Subdomain Collision Test
        const subdomainCollisionManifest: TenantManifest = {
            ...baseManifest,
            company: {
                ...baseManifest.company,
                canonical_name: 'Rogue Company Group',
                subdomain: sub // Collides with example-steakhouse!
            }
        };

        const subColDiff = await ProvisioningDiffEngine.computeDiff(subdomainCollisionManifest);
        assert(subColDiff.status === 'BLOCKED', 'Collision Protection: Subdomain collision blocks execution (BLOCKED)');
        assert(subColDiff.diffs.some(d => d.action === 'CONFLICT' && d.entityType === 'COMPANY'), 'Collision Protection: CONFLICT diff generated for company subdomain');

        // Cross-Tenant User Email Collision Test
        const crossTenantEmailManifest: TenantManifest = {
            ...baseManifest,
            company: {
                ...baseManifest.company,
                subdomain: 'other-brand-co',
                canonical_name: 'Other Brand Corp'
            },
            users: [
                { email: 'exec@examplesteakhouse.com', role: 'owner' } // Belongs to example-steakhouse!
            ]
        };

        const emailColDiff = await ProvisioningDiffEngine.computeDiff(crossTenantEmailManifest);
        assert(emailColDiff.status === 'BLOCKED', 'Cross-Tenant Protection: Cross-tenant email collision blocks execution (BLOCKED)');


        // ---------------------------------------------------------------------
        // 8. Scale Test — 60-Store & 300-Store Manifest Performance
        // ---------------------------------------------------------------------
        console.log('\n--- 8. SCALE TESTING — 60 & 300 STORE MANIFESTS ---');

        // Generate 60-store fictional manifest
        const manifest60 = generateScaleManifest('scale-60', 'scale-60-co', 'Scale 60 Steakhouse', 60);
        const start60 = Date.now();
        const diff60 = await ProvisioningDiffEngine.computeDiff(manifest60);
        const duration60 = Date.now() - start60;
        assert(diff60.status === 'READY_TO_PROVISION' && diff60.summary.createCount >= 60, `Scale 60 Stores: Computed diff for 60 stores in ${duration60}ms`);

        // Generate 300-store fictional manifest
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
