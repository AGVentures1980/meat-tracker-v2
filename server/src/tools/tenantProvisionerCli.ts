// Copyright (c) 2023-2026 AGV VENTURES / Alexandre Garcia. All rights reserved.
// BRASA Meat Intelligence™ — Tenant Provisioner CLI Administration Tool

import fs from 'fs';
import path from 'path';
import { TenantManifest, TenantManifestValidator } from '../services/TenantManifestValidator';
import { TenantProvisioner, ActorContext } from '../services/TenantProvisioner';

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || !['validate', 'plan', 'apply'].includes(command)) {
        console.log('Usage:');
        console.log('  npx ts-node src/tools/tenantProvisionerCli.ts validate <manifest-file.json>');
        console.log('  npx ts-node src/tools/tenantProvisionerCli.ts plan <manifest-file.json>');
        console.log('  npx ts-node src/tools/tenantProvisionerCli.ts apply <run_id> <manifest-file.json>');
        process.exit(1);
    }

    console.log('================================================================');
    console.log(`🏛️  BRASA TENANT PROVISIONER CLI — COMMAND: ${command.toUpperCase()}`);
    console.log('================================================================\n');

    if (command === 'validate') {
        const manifestPath = args[1];
        if (!manifestPath) {
            console.error('Error: Path to manifest JSON file is required');
            process.exit(1);
        }
        const manifest = loadManifest(manifestPath);
        const validation = TenantManifestValidator.validateManifestSchema(manifest);
        const hash = TenantManifestValidator.calculateManifestHash(manifest);

        console.log(`Manifest ID:    ${manifest.manifest_id}`);
        console.log(`Subdomain:      ${manifest.company?.subdomain}`);
        console.log(`Manifest Hash:  ${hash}`);
        console.log(`Valid:          ${validation.isValid ? '✅ YES' : '❌ NO'}`);
        
        if (validation.errors.length > 0) {
            console.log('\nValidation Errors:');
            validation.errors.forEach(e => console.error(`  - ❌ ${e}`));
        }
        if (validation.warnings.length > 0) {
            console.log('\nValidation Warnings:');
            validation.warnings.forEach(w => console.warn(`  - ⚠️  ${w}`));
        }
        process.exit(validation.isValid ? 0 : 1);
    }

    if (command === 'plan') {
        const manifestPath = args[1];
        if (!manifestPath) {
            console.error('Error: Path to manifest JSON file is required');
            process.exit(1);
        }
        const manifest = loadManifest(manifestPath);

        console.log(`Executing Dry Run for Tenant Manifest '${manifest.manifest_id}' (Company: ${manifest.company.canonical_name})...\n`);
        const { diffReport, runId } = await TenantProvisioner.dryRun(manifest, {
            userId: 'cli_operator',
            role: 'admin',
            capabilities: ['TENANT_PROVISION_APPLY']
        });

        console.log(`PROVISIONING_RUN_ID: ${runId}`);
        console.log(`STATUS:              ${diffReport.status}`);
        console.log(`MANIFEST_HASH:       ${diffReport.manifestHash}`);
        console.log(`Total Entities:      ${diffReport.summary.totalEntities}`);
        console.log(`  - CREATE:          ${diffReport.summary.createCount}`);
        console.log(`  - UPDATE:          ${diffReport.summary.updateCount}`);
        console.log(`  - UNCHANGED:       ${diffReport.summary.unchangedCount}`);
        console.log(`  - CONFLICT:        ${diffReport.summary.conflictCount}`);
        console.log(`  - REQUIRES_REVIEW: ${diffReport.summary.requiresReviewCount}`);
        console.log(`  - BLOCKED:         ${diffReport.summary.blockedCount}\n`);

        console.log('--- DETAILED ENTITY DIFFS ---');
        diffReport.diffs.forEach(d => {
            const icon = d.action === 'CREATE' ? '➕' : d.action === 'UPDATE' ? '✏️' : d.action === 'UNCHANGED' ? '🔒' : d.action === 'CONFLICT' ? '❌' : '⚠️';
            console.log(`  ${icon} [${d.action}] (${d.entityType}) ${d.entityKey}: ${d.reason}`);
        });

        console.log('\nDRY RUN COMPLETE — ZERO DATABASE MUTATIONS PERFORMED.');
        console.log(`\nTo apply this validated plan, execute:\n  npx ts-node src/tools/tenantProvisionerCli.ts apply ${runId} ${manifestPath}\n`);
        process.exit(diffReport.status === 'BLOCKED' ? 1 : 0);
    }

    if (command === 'apply') {
        const runId = args[1];
        const manifestPath = args[2];

        if (!runId || !manifestPath) {
            console.error('Error: Both <run_id> and <manifest-file.json> are required for apply command.');
            console.error('Usage: npx ts-node src/tools/tenantProvisionerCli.ts apply <run_id> <manifest-file.json>');
            process.exit(1);
        }

        const manifest = loadManifest(manifestPath);

        const actorContext: ActorContext = {
            userId: 'cli_operator',
            role: 'admin',
            capabilities: ['TENANT_PROVISION_APPLY']
        };

        console.log(`Applying ProvisioningRun '${runId}' for Manifest '${manifest.manifest_id}' (Company: ${manifest.company.canonical_name})...\n`);
        const result = await TenantProvisioner.apply(runId, manifest, actorContext);

        if (result.alreadyApplied) {
            console.log('ℹ️  NOTICE: This ProvisioningRun was ALREADY_APPLIED successfully in a previous operation.');
            console.log(`Provisioning Run ID: ${result.provisioningRunId}`);
            console.log(`Company ID:          ${result.companyId}\n`);
            process.exit(0);
        }

        console.log(`SUCCESS:             ${result.success ? '✅ YES' : '❌ NO'}`);
        console.log(`Company ID:          ${result.companyId}`);
        console.log(`Health Status:       ${result.healthReport.status}`);
        console.log(`Provisioning Run ID: ${result.provisioningRunId}`);

        if (result.healthReport.pendingDeclarations.length > 0) {
            console.log('\nPending Declarations:');
            result.healthReport.pendingDeclarations.forEach(p => console.log(`  - 📋 ${p}`));
        }

        console.log('\nAPPLY EXECUTION COMPLETE.\n');
        process.exit(result.success ? 0 : 1);
    }
}

function loadManifest(manifestPath: string): TenantManifest {
    const absolutePath = path.resolve(process.cwd(), manifestPath);
    if (!fs.existsSync(absolutePath)) {
        console.error(`Error: Manifest file not found at path '${absolutePath}'`);
        process.exit(1);
    }

    try {
        const fileContent = fs.readFileSync(absolutePath, 'utf8');
        return JSON.parse(fileContent);
    } catch (err: any) {
        console.error(`Error: Failed to parse manifest JSON: ${err.message}`);
        process.exit(1);
    }
}

main().catch(err => {
    console.error('CLI Execution Exception:', err.message);
    process.exit(1);
});
