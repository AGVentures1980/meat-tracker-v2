import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const companies = await prisma.company.findMany();
    console.log('COMPANIES:', JSON.stringify(companies, null, 2));

    const stores = await prisma.store.findMany();
    console.log('STORES count:', stores.length);
    console.log('STORES sample:', JSON.stringify(stores.slice(0, 3), null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
