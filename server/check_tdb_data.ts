import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const tdb = await prisma.company.findFirst({ where: { name: { contains: 'Texas de Brazil', mode: 'insensitive' } } });
    if (!tdb) { console.log('TDB not found'); return; }
    
    const stores = await prisma.store.count({ where: { company_id: tdb.id } });
    console.log(`TDB Stores: ${stores}`);
    
    const meats = await prisma.companyProduct.findMany({ where: { company_id: tdb.id } });
    console.log(`TDB Meats: ${meats.length}`);
    meats.forEach(m => console.log(` - ${m.name}`));

    const fdc = await prisma.company.findFirst({ where: { name: { contains: 'Fogo', mode: 'insensitive' } } });
    if (fdc) {
        const fdcStores = await prisma.store.count({ where: { company_id: fdc.id } });
        console.log(`FDC Stores: ${fdcStores}`);
    }
}
main().finally(() => prisma.$disconnect());
