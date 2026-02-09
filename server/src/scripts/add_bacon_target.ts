
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Adding Bacon Target to All Stores...');

    const BACON_TARGET = 0.065; // Derived from Tampa (735 lbs / 11311 guests)

    const stores = await prisma.store.findMany();

    console.log(`Found ${stores.length} stores. Updating...`);

    for (const store of stores) {
        await prisma.storeMeatTarget.upsert({
            where: {
                store_id_protein: {
                    store_id: store.id,
                    protein: 'Bacon'
                }
            },
            update: { target: BACON_TARGET },
            create: {
                store_id: store.id,
                protein: 'Bacon',
                target: BACON_TARGET
            }
        });
        // console.log(` - Updated ${store.store_name}`);
    }

    console.log('✅ Bacon target added/updated for all stores.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
