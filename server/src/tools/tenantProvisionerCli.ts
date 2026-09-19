// Copyright (c) 2023-2026 AGV VENTURES / Alexandre Garcia. All rights reserved.
// BRASA Meat Intelligence™ — Tenant Provisioner CLI Administration Tool

import fs from 'fs';
import path from 'path';
import { TenantManifest, TenantManifestValidator } from '../services/TenantManifestValidator';
import { TenantProvisioner } from '../services/TenantProvisioner';

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const manifestPath = args[1];

    if (!command || !['validate', 'plan', 'apply'].includes(command)) {
        console.log('Usage: npx ts-node src/tools/tenantProvisionerCli.ts <validate|plan|apply> <manifest-file.json>');
        process.exit(1);
    }

    if (!manifestPath) {
        console.error('Error: Path to manifest JSON file is required');
        process.exit(1);
    }

    const absolutePath = path.resolve(process.cwd(), manifestPath);
    if (!fs.existsSync(absolutePath)) {
        console.error(`Error: Manifest file not found at path '${absolutePath}'`);
        process.exit(1);
    }

    let manifest: TenantManifest;
    try {
        const fileContent = fs.readFileSync(absolutePath, 'utf8');
        manifest = JSON.parse(fileContent);
    } catch (err: any) {
        console.error(`Error: Failed to parse manifest JSON: ${err.message}`);
        process.exit(1);
    }

    console.log('================================================================');
    console.log(`🏛️  BRASA TENANT PROVISIONER CLI — COMMAND: ${command.toUpperCase()}`);
    console.log('================================================================\n');

    if (command === 'validate') {
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
        console.log(`Executing Dry Run for Tenant Manifest '${manifest.manifest_id}' (Company: ${manifest.company.canonical_name})...\n`);
        const report = await TenantProvisioner.dryRun(manifest, 'cli_operator');

        console.log(`STATUS:              ${report.status}`);
        console.log(`Manifest Hash:       ${report.manifestHash}`);
        console.log(`Total Entities:      ${report.summary.totalEntities}`);
        console.log(`  - CREATE:          ${report.summary.createCount}`);
        console.log(`  - UPDATE:          ${report.summary.updateCount}`);
        console.log(`  - UNCHANGED:       ${report.summary.unchangedCount}`);
        console.log(`  - CONFLICT:        ${report.summary.conflictCount}`);
        console.log(`  - REQUIRES_REVIEW: ${report.summary.requiresReviewCount}`);
        console.log(`  - BLOCKED:         ${report.summary.blockedCount}\n`);

        console.log('--- DETAILED ENTITY DIFFS ---');
        report.diffs.forEach(d => {
            const icon = d.action === 'CREATE' ? '➕' : d.action === 'UPDATE' ? '✏️' : d.action === 'UNCHANGED' ? '🔒' : d.action === 'CONFLICT' ? '❌' : '⚠️';
            console.log(`  ${icon} [${d.action}] (${d.entityType}) ${d.entityKey}: ${d.reason}`);
        });

        console.log('\nDRY RUN COMPLETE — ZERO DATABASE MUTATIONS PERFORMED.\n');
        process.exit(report.status === 'BLOCKED' ? 1 : 0);
    }

    if (command === 'apply') {
        console.log(`Applying Tenant Manifest '${manifest.manifest_id}' (Company: ${manifest.company.canonical_name})...\n`);
        const result = await TenantProvisioner.apply(manifest, 'cli_operator');

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

main().catch(err => {
    console.error('CLI Execution Exception:', err);
    process.exit(1);
});
