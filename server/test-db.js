const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const hr = await prisma.company.findFirst({ where: { name: { contains: 'Hard Rock', mode: 'insensitive' } } });
    const tg = await prisma.company.findFirst({ where: { name: { contains: 'Terra Gaucha', mode: 'insensitive' } } });
    
    const hrStores = await prisma.store.findMany({ where: { company_id: hr.id } });
    console.log("HR Stores:", hrStores.map(s => ({ id: s.id, name: s.store_name })));
    
    const tgStores = await prisma.store.findMany({ where: { company_id: tg.id } });
    console.log("TG Stores:", tgStores.map(s => ({ id: s.id, name: s.store_name })));
}
main().finally(() => prisma.$disconnect());
