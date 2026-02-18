
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Audit & Waste Data...');

    // 1. Create Suspicious Gate Overrides (3 in 2 days)
    // Check if store exists first, default to ID 1 or find first
    const store = await prisma.store.findFirst();
    if (!store) {
        console.log("No store found, skipping seeding.");
        return;
    }
    const storeName = store.store_name || "Test Store";

    await prisma.auditLog.createMany({
        data: [
            { action: 'NO_DELIVERY_FLAG', location: storeName, resource: 'Gate Override', details: { reason: 'Test 1' }, created_at: new Date(Date.now() - 86400000) },
            { action: 'NO_DELIVERY_FLAG', location: storeName, resource: 'Gate Override', details: { reason: 'Test 2' }, created_at: new Date() },
            { action: 'NO_DELIVERY_FLAG', location: storeName, resource: 'Gate Override', details: { reason: 'Test 3' }, created_at: new Date() }
        ]
    });

    // 2. Create Villain Waste (Picanha)
    // Need to structure items correctly as JSON
    const items = [
        { protein: 'Picanha', weight: 15.5, reason: 'Overcooked' },
        { protein: 'Lamb Chops', weight: 8.2, reason: 'Dropped' }
    ];

    await prisma.wasteLog.create({
        data: {
            store_id: store.id,
            date: new Date(),
            shift: 'Dinner',
            input_by: 'TestScript',
            user_id: 'test-user',
            items: items,
            created_at: new Date()
        }
    });

    console.log('Seeding Complete!');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
