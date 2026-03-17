import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting script...");
    const stores = await prisma.store.findMany();
    console.log(`Found ${stores.length} stores.`);

    // Reset all
    await prisma.store.updateMany({ data: { is_pilot: false } });

    // Set pilots
    const toUpdate = stores.filter(s => 
        s.store_name.toLowerCase().includes('dallas') ||
        s.store_name.toLowerCase().includes('addison') ||
        s.store_name.toLowerCase().includes('miami beach') ||
        s.store_name.toLowerCase().includes('las vegas')
    );

    for (const store of toUpdate) {
        await prisma.store.update({
            where: { id: store.id },
            data: { is_pilot: true }
        });
        console.log(`Set ${store.store_name} as pilot.`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
