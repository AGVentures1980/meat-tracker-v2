
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Financial Targets from Image ($/Guest)
const FINANCIAL_TARGETS: Record<string, number> = {
    'Bone-in Ribeye': 0.82,
    'Fraldinha/Flank Steak': 1.55,
    'Picanha': 3.39,
    'Beef Ribs': 0.73,
    'Filet Mignon': 1.15,
    'Chicken Breast': 0.25,
    'Chicken Drumstick': 0.15,
    'Lamb Chops': 0.49,
    'Lamb Picanha': 0.30,
    'Pork Belly': 0.10,
    'Pork Ribs': 0.04,  // "Pork Crown/Chop"
    'Pork Loin': 0.12,
    'Sausage': 0.19,
    'Bacon': 0.22,       // Calculated: 0.065 * 3.33
    'Tri-Tip': 0.00,
    'Leg of Lamb': 0.00
};

// Prices from MeatEngine for derivation
const PRICES: Record<string, number> = {
    'Picanha': 9.14,
    'Fraldinha/Flank Steak': 8.24,
    'Tri-Tip': 5.26,
    'Filet Mignon': 9.50,
    'Beef Ribs': 8.36,
    'Pork Ribs': 2.80,
    'Pork Loin': 2.47,
    'Chicken Drumstick': 1.37,
    'Chicken Breast': 1.47,
    'Lamb Chops': 13.91,
    'Leg of Lamb': 6.21,
    'Lamb Picanha': 9.20,
    'Sausage': 3.16,
    'Bacon': 3.33,
    'Bone-in Ribeye': 9.14, // Estimated/Standard
    'Pork Belly': 4.50      // Standard
};

async function main() {
    console.log('Populating Financial Targets ($/Guest) for All Stores...');

    const stores = await prisma.store.findMany();
    console.log(`Found ${stores.length} stores.`);

    for (const store of stores) {
        // 1. Update Store-Level Total Target
        await prisma.store.update({
            where: { id: store.id },
            data: { target_cost_guest: 9.94 }
        });

        // 2. Update Per-Protein Financial Targets
        for (const [protein, costTarget] of Object.entries(FINANCIAL_TARGETS)) {
            let price = PRICES[protein] || 10.00;
            // Fallback for Bone-in Ribeye if not exact in map
            if (protein === 'Bone-in Ribeye' && !PRICES[protein]) price = 9.14;

            const derivedLbsTarget = price > 0 ? (costTarget / price) : 0;

            await prisma.storeMeatTarget.upsert({
                where: {
                    store_id_protein: {
                        store_id: store.id,
                        protein: protein
                    }
                },
                update: {
                    cost_target: costTarget
                },
                create: {
                    store_id: store.id,
                    protein: protein,
                    target: derivedLbsTarget,
                    cost_target: costTarget
                }
            });
        }
    }

    console.log('✅ Financial targets populated.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
