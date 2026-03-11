const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Starting FDC Sync...");
    const defaultFdcCompanyId = '43670635-c205-4b19-99d4-445c7a683730';

    const desiredProteins = [
        "Beef Picanha (Top Butt Caps)",
        "Beef Flap Meat (Fraldinha)",
        "Chicken Leg",
        "Beef Top Butt Sirloin (Alcatra)",
        "Chicken Breast",
        "Lamb Top Sirloin Caps",
        "Beef \"Bone-in-Ribeye\", Export",
        "Pork Loin",
        "Lamb Rack",
        "Pork Sausage",
        "Beef Short Ribs",
        "Beef Tenderloin",
        "Pork Crown (Rack)",
        "Pork Belly",
        "Chicken Heart",
        "Beef Porterhouse Short Loin",
        "Bacon",
        "Steak with Bacon"
    ];

    // 1. Fetch current proteins for FDC
    const existing = await prisma.companyProduct.findMany({
        where: { company_id: defaultFdcCompanyId }
    });

    // 2. Add missing proteins
    for (const pName of desiredProteins) {
        if (!existing.find(e => e.name === pName)) {
            await prisma.companyProduct.create({
                data: {
                    name: pName,
                    company_id: defaultFdcCompanyId,
                    category: pName.toLowerCase().includes('chicken') ? 'chicken' : (pName.toLowerCase().includes('pork') ? 'pork' : (pName.toLowerCase().includes('lamb') ? 'lamb' : 'beef')),
                    unit_of_measure: 'lb',
                    is_active: true
                }
            });
            console.log("Added protein:", pName);
        }
    }

    // 3. Remove proteins NOT in the desired list
    for (const e of existing) {
        if (!desiredProteins.includes(e.name)) {
            await prisma.companyProduct.delete({
                where: { id: e.id }
            });
            console.log("Removed protein:", e.name);
        }
    }

    // 4. Assign Area Managers to new stores
    // list of new stores: 'Santa Monica', 'Rancho Cucamonga', 'Columbus', 'Charlotte', 'Katy', 'Tualatin', 'Daly City', 'Princeton', 'Peoria'
    const newStores = ['Santa Monica', 'Rancho Cucamonga', 'Columbus', 'Charlotte', 'Katy', 'Tualatin', 'Daly City', 'Princeton', 'Peoria'];
    const areaManagers = await prisma.user.findMany({
        where: { role: 'area_manager' },
        select: { id: true, first_name: true, last_name: true }
    });

    if (areaManagers.length > 0) {
        for (let i = 0; i < newStores.length; i++) {
            const storeName = newStores[i];
            const manager = areaManagers[i % areaManagers.length];
            const store = await prisma.store.findFirst({ where: { store_name: storeName } });
            if (store) {
                await prisma.store.update({
                    where: { id: store.id },
                    data: { area_manager_id: manager.id }
                });
                console.log(`Assigned AM ${manager.first_name} ${manager.last_name} to store ${storeName}`);
            }
        }
    } else {
        console.log("No Area Managers found to assign.");
    }

    console.log("FDC Sync Complete.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
