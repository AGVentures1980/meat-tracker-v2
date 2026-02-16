import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const storeId = 1; // Default Store
    const companyId = 'CMP-001';

    // Ensure Company exists
    const company = await prisma.company.upsert({
        where: { id: companyId },
        update: {},
        create: {
            id: companyId,
            name: 'Brasa Group',
            // Add other required fields if any
        }
    });
    console.log(`Company ensured: ${company.name}`);

    // Ensure Store exists
    const store = await prisma.store.upsert({
        where: { id: storeId },
        update: {},
        create: {
            id: storeId,
            store_name: 'Brasa Store #1',
            company_id: companyId,
            location: 'Default Location'
        }
    });
    console.log(`Store ensured: ${store.store_name}`);

    // Delete existing targets? Not needed if count is 0

    const targets = [
        { protein: 'Picanha', target: 0.35, store_id: storeId },
        { protein: 'Alcatra', target: 0.25, store_id: storeId },
        { protein: 'Fraldinha', target: 0.20, store_id: storeId },
        { protein: 'Filet Mignon', target: 0.15, store_id: storeId },
        { protein: 'Parmesan Pork', target: 0.10, store_id: storeId },
        { protein: 'Chicken Legs', target: 0.12, store_id: storeId },
        { protein: 'Sausage', target: 0.15, store_id: storeId },
        { protein: 'Lamb Chops', target: 0.08, store_id: storeId },
        { protein: 'Beef Ribs', target: 0.10, store_id: storeId },
        { protein: 'Pineapple', target: 0.05, store_id: storeId },
    ];

    console.log(`Seeding ${targets.length} targets...`);

    for (const t of targets) {
        await prisma.storeMeatTarget.create({
            data: {
                store_id: t.store_id,
                protein: t.protein,
                target: t.target,

                // Add fake created_at/updated_at if needed, likely default
            }
        });
    }

    console.log('Seeding complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
