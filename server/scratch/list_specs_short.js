require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    console.log('--- CORPORATE PROTEIN SPECS (SHORT) ---');
    const specs = await prisma.corporateProteinSpec.findMany({
        select: { id: true, protein_name: true, approved_item_code: true, supplier: true, expected_weight_min: true, expected_weight_max: true }
    });
    console.log(JSON.stringify(specs, null, 2));

    console.log('--- SUPPLIERS (SHORT) ---');
    const suppliers = await prisma.supplierProfile.findMany({
        select: { id: true, name: true }
    });
    console.log(JSON.stringify(suppliers, null, 2));

    console.log('--- SUPPLIER CATALOG ITEMS (SHORT) ---');
    const catalog = await prisma.supplierCatalogItem.findMany({
        select: { id: true, supplierId: true, supplierItemCode: true, linkedProteinSpecId: true, gtin: true }
    });
    console.log(JSON.stringify(catalog, null, 2));

    console.log('--- COMPANIES (SHORT) ---');
    const companies = await prisma.company.findMany({
        select: { id: true, name: true }
    });
    console.log(JSON.stringify(companies, null, 2));
}
run().then(() => process.exit(0));
