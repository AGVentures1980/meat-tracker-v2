const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { MEAT_UNIT_WEIGHTS } = require('./build/config/meat_weights.js');
const { MEAT_STANDARDS } = require('./build/config/standards.js');
const { MEAT_COSTS_LB, FINANCIAL_TARGET_GUEST, FINANCIAL_TOLERANCE_THRESHOLD } = require('./build/config/costs.js');

const VILLAINS = ['Picanha', 'Picanha with Garlic', 'Lamb Picanha', 'Beef Ribs', 'Lamb Chops', 'Filet Mignon', 'Filet Mignon with Bacon', 'Fraldinha', 'Flap Steak'];

async function testPrep() {
    try {
        const storeId = 1;
        const dateStr = new Date().toISOString().split('T')[0];
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay();

        console.log(`Testing getDailyPrep for store ${storeId} on ${dateStr}`);

        const store = await prisma.store.findUnique({
            where: { id: storeId },
            include: { meat_targets: true }
        });

        if (!store) {
            console.error("Store not found");
            return;
        }

        const targetLbsPerGuest = store.target_lbs_guest || 1.76;
        const targetCostPerGuest = store.target_cost_guest || 9.94;

        let forecast = 200;

        const centralNow = new Date(); // roughly
        const isDinner = centralNow.getHours() >= 15;
        const bufferMultiplier = isDinner ? 1.20 : 1.0;
        const dineInMeatLbs = (forecast * bufferMultiplier) * targetLbsPerGuest;

        const fourWeeksAgo = new Date(date);
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

        console.log("Fetching delivery sales...");
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
        console.log(`Delivery Buffer: ${deliveryBufferLbs}`);

        const totalMeatLbs = dineInMeatLbs + deliveryBufferLbs;
        const prepList = [];
        const DISCONTINUED = ['Alcatra', 'Bone-in Ribeye'];
        const proteins = Object.keys(MEAT_UNIT_WEIGHTS).filter(p => !DISCONTINUED.includes(p));

        let totalPredictedCost = 0;

        console.log("Processing proteins...");
        for (const protein of proteins) {
            let mixPercentage = 0;
            const meatTargets = store.meat_targets || [];
            const specificOverride = meatTargets.find((t) => t.protein === protein);

            if (specificOverride) {
                mixPercentage = specificOverride.target / targetLbsPerGuest;
            } else {
                const stdVal = MEAT_STANDARDS[protein] || 0;
                mixPercentage = stdVal / 1.76;
            }

            const isVillain = VILLAINS.some(v => protein.includes(v));
            const neededLbs = totalMeatLbs * mixPercentage;
            const costLb = MEAT_COSTS_LB[protein] || 6.00;
            totalPredictedCost += neededLbs * costLb;

            let unitWeight = MEAT_UNIT_WEIGHTS[protein] || 1;
            let unitName = 'Piece/Whole';
            // ... omitting long unit checks

            const neededUnits = neededLbs / unitWeight;

            prepList.push({
                protein,
                unit_name: unitName,
                avg_weight: parseFloat(unitWeight.toFixed(2)),
                mix_percentage: (mixPercentage * 100).toFixed(1) + '%',
                recommended_lbs: parseFloat(neededLbs.toFixed(2)),
                recommended_units: Math.ceil(neededUnits),
                cost_lb: costLb,
                is_villain: isVillain
            });
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
