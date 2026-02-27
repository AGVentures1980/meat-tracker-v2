const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { MEAT_UNIT_WEIGHTS } = require('./dist/src/config/meat_weights.js');
const { MEAT_STANDARDS } = require('./dist/src/config/standards.js');
const { MEAT_COSTS_LB, FINANCIAL_TARGET_GUEST, FINANCIAL_TOLERANCE_THRESHOLD } = require('./dist/src/config/costs.js');

const VILLAINS = ['Picanha', 'Picanha with Garlic', 'Lamb Picanha', 'Beef Ribs', 'Lamb Chops', 'Filet Mignon', 'Filet Mignon with Bacon', 'Fraldinha', 'Flap Steak'];

async function testPrep() {
    try {
        const storeId = 20;
        const dateStr = new Date().toISOString().split('T')[0];
        const date = new Date(dateStr);

        const store = await prisma.store.findUnique({
            where: { id: storeId },
            include: { meat_targets: true }
        });

        if (!store) {
            console.error("Store not found"); return;
        }

        const targetLbsPerGuest = store.target_lbs_guest || 1.76;
        let forecast = 200;
        const isDinner = true;
        const bufferMultiplier = isDinner ? 1.20 : 1.0;
        const dineInMeatLbs = (forecast * bufferMultiplier) * targetLbsPerGuest;

        const fourWeeksAgo = new Date(date);
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

        const pastDeliveries = await prisma.deliverySale.findMany({
            where: {
                store_id: storeId,
                created_at: { gte: fourWeeksAgo, lte: date }
            }
        });
        const totalPastDeliveryLbs = pastDeliveries.reduce((acc, sale) => acc + (sale.total_lbs || 0), 0);
        let deliveryBufferLbs = (totalPastDeliveryLbs / 28) || 0;
        if (deliveryBufferLbs === 0 && storeId === 1) {
            deliveryBufferLbs = isDinner ? 45.5 : 22.0;
        }

        const totalMeatLbs = dineInMeatLbs + deliveryBufferLbs;
        const prepList = [];
        const proteins = Object.keys(MEAT_UNIT_WEIGHTS).filter(p => !['Alcatra', 'Bone-in Ribeye'].includes(p));

        for (const protein of proteins) {
            const isVillain = VILLAINS.some(v => protein.includes(v));
            prepList.push({ protein, isVillain });
        }

        console.log(`Prep list length: ${prepList.length}`);
        console.log("DONE! Success.");

    } catch (e) {
        console.error("FATAL ERROR:", e);
    } finally {
        prisma.$disconnect();
    }
}
testPrep();
