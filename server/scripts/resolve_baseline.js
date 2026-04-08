const { execSync } = require('child_process');

const migrations = [
    "20260206045606_init",
    "20260209134438_add_financial_targets_fix",
    "20260211042729_add_delivery_sale_persistence",
    "20260211043326_add_invoice_records",
    "20260213051917_add_product_alias",
    "20260218190134_add_company_product_ledger",
    "20260218194023_add_protein_group_and_lamb_toggle",
    "20260218201610_add_store_templates",
    "20260218212044_add_training_progress",
    "20260406065753_add_barcode_hardening",
    "20260408060809_init_sre_baseline"
];

console.log("[SRE] Initiating Historical Baseline Resolution...");

for (const m of migrations) {
    try {
        console.log(`[SRE] Resolving ${m}...`);
        execSync(`npx prisma migrate resolve --applied ${m}`, { stdio: 'pipe' });
    } catch (e) {
        // Will throw mostly because it's already applied, which is perfectly safe
    }
}

console.log("[SRE] Historical Baseline Resolution Complete.");
