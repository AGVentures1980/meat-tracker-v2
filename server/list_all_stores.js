const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const stores = await prisma.store.findMany();
    console.log(stores.map(s => ({ id: s.id, name: s.store_name, company_id: s.company_id })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
