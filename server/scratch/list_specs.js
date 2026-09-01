require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    console.log('--- CORPORATE PROTEIN SPECS ---');
    const specs = await prisma.corporateProteinSpec.findMany();
    console.log(JSON.stringify(specs, null, 2));

    console.log('--- SUPPLIERS ---');
    const suppliers = await prisma.supplierProfile.findMany();
    console.log(JSON.stringify(suppliers, null, 2));

    console.log('--- SUPPLIER CATALOG ITEMS ---');
    const catalog = await prisma.supplierCatalogItem.findMany();
    console.log(JSON.stringify(catalog, null, 2));

    console.log('--- COMPANIES ---');
    const companies = await prisma.company.findMany();
    console.log(JSON.stringify(companies, null, 2));

    console.log('--- STORES ---');
    const stores = await prisma.store.findMany();
    console.log(JSON.stringify(stores, null, 2));
}
run().then(() => process.exit(0));
