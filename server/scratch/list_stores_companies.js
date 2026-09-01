require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    console.log('--- ALL COMPANIES ---');
    const companies = await prisma.company.findMany({
        select: { id: true, name: true }
    });
    console.log(companies);

    console.log('--- ALL STORES ---');
    const stores = await prisma.store.findMany({
        select: { id: true, store_name: true, company_id: true }
    });
    console.log(stores);
}
run().then(() => process.exit(0));
