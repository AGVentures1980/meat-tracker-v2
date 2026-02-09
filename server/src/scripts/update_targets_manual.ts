
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Data extracted from User Images (Phase 12)
const MANUAL_TARGETS: Record<string, number> = {
    'Addison': 1.23,
    'Albuquerque': 1.77,
    'Atlanta': 1.84,
    'Austin Congress': 1.80,
    'Baltimore': 1.90,
    'Bellevue': 1.80
};

async function main() {
    console.log('Starting manual target injection...');
    let updatedCount = 0;

    for (const [storeName, target] of Object.entries(MANUAL_TARGETS)) {
        console.log(`Processing ${storeName}...`);

        // Find store by name pattern
        const store = await prisma.store.findFirst({
            where: {
                store_name: {
                    contains: storeName,
                    mode: 'insensitive'
                }
            }
        });

        if (!store) {
            console.warn(`⚠️ Store not found for "${storeName}"`);
            continue;
        }

        // Update target
        await prisma.store.update({
            where: { id: store.id },
            data: { target_lbs_guest: target }
        });

        console.log(`✅ Updated ${store.store_name} (ID: ${store.id}) to Target: ${target}`);
        updatedCount++;
    }

    console.log(`\nSUCCESS: Updated ${updatedCount} stores from manual list.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
