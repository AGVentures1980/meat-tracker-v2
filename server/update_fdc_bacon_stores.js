const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const defaultFdcCompanyId = '43670635-c205-4b19-99d4-445c7a683730';
    const tdbCompanyId = 'd8614457-37fb-468f-9a9f-6bd92ebbfd5b';

    // 1. ADD NEW FDC LOCATIONS
    const newStores = [
        { store_name: 'Santa Monica', company_id: defaultFdcCompanyId, address: 'California', timezone: 'America/Los_Angeles', is_lunch_enabled: true },
        { store_name: 'Rancho Cucamonga', company_id: defaultFdcCompanyId, address: 'California', timezone: 'America/Los_Angeles', is_lunch_enabled: true },
        { store_name: 'Columbus', company_id: defaultFdcCompanyId, address: 'Ohio', timezone: 'America/New_York', is_lunch_enabled: true },
        { store_name: 'Charlotte', company_id: defaultFdcCompanyId, address: 'North Carolina', timezone: 'America/New_York', is_lunch_enabled: true },
        { store_name: 'Katy', company_id: defaultFdcCompanyId, address: 'Texas', timezone: 'America/Chicago', is_lunch_enabled: true },
        { store_name: 'Tualatin', company_id: defaultFdcCompanyId, address: 'Oregon', timezone: 'America/Los_Angeles', is_lunch_enabled: true },
        { store_name: 'Daly City', company_id: defaultFdcCompanyId, address: 'California', timezone: 'America/Los_Angeles', is_lunch_enabled: true },
        { store_name: 'Princeton', company_id: defaultFdcCompanyId, address: 'New Jersey', timezone: 'America/New_York', is_lunch_enabled: true },
        { store_name: 'Peoria', company_id: defaultFdcCompanyId, address: 'Arizona', timezone: 'America/Phoenix', is_lunch_enabled: true }
    ];
    for (const s of newStores) {
        const exist = await prisma.store.findFirst({ where: { store_name: s.store_name } });
        if (!exist) {
            await prisma.store.create({ data: s });
            console.log('Created Store:', s.store_name);
        } else {
            console.log('Store already exists:', s.store_name);
        }
    }

    // 2. TDB PROTEIN SEED: Add Bacon
    const tdbBacon = await prisma.companyProduct.findFirst({ where: { company_id: tdbCompanyId, name: 'Bacon' } });
    if (!tdbBacon) {
        await prisma.companyProduct.create({
            data: { name: 'Bacon', company_id: tdbCompanyId, category: 'pork', unit_of_measure: 'lb', is_active: true }
        });
        console.log('Added Bacon to TDB');
    }

    // 3. FDC PROTEIN SEED: Add Bacon, Remove Filet Bacon, Add Steak with Bacon
    const fdcBacon = await prisma.companyProduct.findFirst({ where: { company_id: defaultFdcCompanyId, name: 'Bacon' } });
    if (!fdcBacon) {
        await prisma.companyProduct.create({
            data: { name: 'Bacon', company_id: defaultFdcCompanyId, category: 'pork', unit_of_measure: 'lb', is_active: true }
        });
        console.log('Added Bacon to FDC');
    }

    await prisma.companyProduct.deleteMany({ where: { company_id: defaultFdcCompanyId, name: 'Filet Bacon' } });
    console.log('Removed Filet Bacon from FDC');

    const fdcSwb = await prisma.companyProduct.findFirst({ where: { company_id: defaultFdcCompanyId, name: 'Steak with Bacon' } });
    if (!fdcSwb) {
        await prisma.companyProduct.create({
            data: { name: 'Steak with Bacon', company_id: defaultFdcCompanyId, category: 'beef', unit_of_measure: 'lb', is_active: true }
        });
        console.log('Added Steak with Bacon to FDC');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
