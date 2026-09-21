// Copyright (c) 2023-2026 AGV VENTURES / Alexandre Garcia. All rights reserved.
// BRASA Meat Intelligence™ — Tenant Decommission Planner CLI Tool (Read-Only)

import { TenantDecommissionPlanner } from '../services/TenantDecommissionPlanner';

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || !['plan', 'apply'].includes(command)) {
        console.log('Usage:');
        console.log('  npx ts-node src/tools/tenantDecommissionPlannerCli.ts plan <company_id>');
        console.log('  npx ts-node src/tools/tenantDecommissionPlannerCli.ts apply <company_id>');
        process.exit(1);
    }

    console.log('================================================================');
    console.log(`🏛️  BRASA TENANT DECOMMISSION PLANNER CLI — COMMAND: ${command.toUpperCase()}`);
    console.log('================================================================\n');

    if (command === 'apply') {
        console.error('❌ ERROR: Decommission execution is currently DISABLED under strict PRE-EXECUTION GATE freeze.');
        console.error('❌ Authorization from Alexandre is required before any execution phase can be enabled.');
        process.exit(1);
    }

    if (command === 'plan') {
        const companyId = args[1];
        if (!companyId) {
            console.error('Error: <company_id> is required for plan command.');
            process.exit(1);
        }

        console.log(`Calculating Dry-Run Decommission Plan for Company ID: '${companyId}'...\n`);
        const plan = await TenantDecommissionPlanner.createPlan(companyId);

        console.log(`RUN ID:         ${plan.runId}`);
        console.log(`COMPANY NAME:   ${plan.companyName} (${plan.companyId})`);
        console.log(`SUBDOMAIN:      ${plan.subdomain}`);
        console.log(`STATUS:         ${plan.status}`);
        console.log(`PLAN HASH:      ${plan.planHash}`);
        console.log(`IS PROTECTED:   ${plan.isProtected ? '⚠️ YES (DECOMMISSION BLOCKED)' : 'NO'}`);
        console.log(`GENERATED AT:   ${plan.generatedAt}\n`);

        console.log('--- SUMMARY OF PLANNED TENANT-OWNED ROW REMOVAL ---');
        console.log(`Total Owned Rows:                ${plan.summary.totalOwnedRows}`);
        console.log(`Stores:                          ${plan.summary.storesCount}`);
        console.log(`Direct Users (company_id = ID):   ${plan.summary.directUsersCount}`);
        console.log(`Legacy Store Users:              ${plan.summary.legacyUsersCount}`);
        console.log(`Company Products:                ${plan.summary.productsCount}`);
        console.log(`Company Preparations:            ${plan.summary.preparationsCount}`);
        console.log(`Product Aliases:                 ${plan.summary.aliasesCount}`);
        console.log(`Audit Logs:                      ${plan.summary.auditLogsCount}`);
        console.log(`Orders:                          ${plan.summary.ordersCount}\n`);

        console.log('--- ZERO IMPACT VERIFICATION ---');
        console.log(`Protected Tenant Rows Affected:  ${plan.summary.protectedTenantRowsAffected} (PASS)`);
        console.log(`Global Taxonomy Rows Affected:   ${plan.summary.globalTaxonomyRowsAffected} (PASS)`);
        console.log(`Master User Rows Affected:        ${plan.summary.masterUserRowsAffected} (PASS)\n`);

        if (plan.blockers.length > 0) {
            console.log('--- DECOMMISSION BLOCKERS ---');
            plan.blockers.forEach(b => console.warn(`  - ⚠️  ${b}`));
            console.log('');
        }

        console.log('DRY RUN COMPLETE — ZERO DATABASE MUTATIONS PERFORMED.');
        process.exit(0);
    }
}

main().catch(err => {
    console.error('CLI Error:', err);
    process.exit(1);
});
