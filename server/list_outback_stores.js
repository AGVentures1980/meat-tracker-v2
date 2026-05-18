const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const outback = await prisma.company.findFirst({
        where: { subdomain: 'outback' }
    });
    
    const stores = await prisma.store.findMany({
        where: { company_id: outback.id }
    });
    console.log(stores.map(s => ({ id: s.id, name: s.store_name })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
