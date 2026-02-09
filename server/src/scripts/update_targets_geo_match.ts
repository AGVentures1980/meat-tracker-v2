
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapping: User Image Store -> Database Store (Closest Match)
const GEO_MAPPING: Record<string, { target: number, dbStorePattern: string }> = {
    'Addison': { target: 1.23, dbStorePattern: 'Addison' },
    'Albuquerque': { target: 1.77, dbStorePattern: 'Denver' }, // NM -> CO (Mountain)
    'Atlanta': { target: 1.84, dbStorePattern: 'Birming' },    // GA -> AL (South)
    'Austin Congress': { target: 1.80, dbStorePattern: 'SanAnt' }, // Austin -> San Antonio
    'Baltimore': { target: 1.90, dbStorePattern: 'FairOak' },  // MD -> VA (DC Metro)
    'Bellevue': { target: 1.80, dbStorePattern: 'Tacoma' }     // WA -> WA (Seattle Area)
};

async function main() {
    console.log('Starting Geographic Target Injection...');
    let updatedCount = 0;

    for (const [sourceName, config] of Object.entries(GEO_MAPPING)) {
        console.log(`Mapping ${sourceName} (${config.target}) -> DB Pattern "${config.dbStorePattern}"...`);

        // Find store by name pattern
        const store = await prisma.store.findFirst({
            where: {
                store_name: {
                    contains: config.dbStorePattern,
                    mode: 'insensitive'
                }
            }
        });

        if (!store) {
            console.warn(`⚠️ Target DB Store not found for pattern "${config.dbStorePattern}"`);
            continue;
        }

        // Update target
        await prisma.store.update({
            where: { id: store.id },
            data: { target_lbs_guest: config.target }
        });

        console.log(`✅ Applied ${sourceName} Target (${config.target}) to ${store.store_name} (ID: ${store.id})`);
        updatedCount++;
    }

    console.log(`\nSUCCESS: Updated ${updatedCount} proxies via geographic match.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
