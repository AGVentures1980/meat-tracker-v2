const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Applying store classifications...");

    // 1. Promote Stamford (ID: 4) to LIVE
    const liveStore = await prisma.store.update({
        where: { id: 4 },
        data: { data_type: 'LIVE' }
    });
    console.log(`Promoted to LIVE: ${liveStore.store_name} (ID: ${liveStore.id})`);

    // 2. Set all other stores explicitly to DEMO
    const updatedDemoStores = await prisma.store.updateMany({
        where: {
            id: { not: 4 }
        },
        data: {
            data_type: 'DEMO'
        }
    });
    console.log(`Set ${updatedDemoStores.count} other stores to DEMO.`);

    // 3. Print final classifications
    const allStores = await prisma.store.findMany({
        include: { company: true },
        orderBy: { id: 'asc' }
    });

    console.log("\nFinal Store List & data_type Classifications:");
    console.log("---------------------------------------------");
    for (const store of allStores) {
        console.log(`ID: ${store.id.toString().padEnd(4)} | Name: ${store.store_name.padEnd(25)} | Company: ${store.company.name.padEnd(25)} | data_type: ${store.data_type}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
