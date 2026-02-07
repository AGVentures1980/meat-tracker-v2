const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Planting Real History (Weeks 1-9 of 2026)...');

    // Get Stores
    const stores = await prisma.store.findMany();

    if (stores.length === 0) {
        console.error("No stores found! Run normal seed first.");
        return;
    }

    // Helper to get dates
    const getWeekDateRange = (y, w) => {
        const simple = new Date(y, 0, 1 + (w - 1) * 7);
        const dayOfWeek = simple.getDay();
        const ISOweekStart = simple;
        if (dayOfWeek <= 4)
            ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
        else
            ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());

        const start = new Date(ISOweekStart);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return { start, end };
    };

    // Simulate Weeks 1 to 9
    for (let w = 1; w <= 9; w++) {
        const { start, end } = getWeekDateRange(2026, w);
        console.log(`Doing Week ${w}: ${start.toISOString().split('T')[0]}`);

        for (const store of stores) {
            // Check if Report already exists (Upsert logic for Report, skip others if exists)
            const reportKey = `2026-W${w}`;
            const existingReport = await prisma.report.findUnique({
                where: {
                    store_id_month: {
                        store_id: store.id,
                        month: reportKey
                    }
                }
            });

            if (existingReport) {
                console.log(`Skipping Week ${w} for ${store.store_name} (Already seeded)`);
                continue;
            }

            // 1. Initial Inventory (Monday)
            const startInv = 200 + Math.random() * 50;
            await prisma.inventoryRecord.create({
                data: {
                    store_id: store.id,
                    date: start, // Logic uses "LTE" so this counts as start
                    item_name: 'Picanha',
                    quantity: startInv
                }
            });

            // 2. Purchases (Wednesday)
            const midWeek = new Date(start);
            midWeek.setDate(start.getDate() + 2);

            // Randomize purchase to create variance
            const purchased = 500 + Math.random() * 200;
            const cost = purchased * (5.50 + Math.random() * 1.50); // Varying cost price

            await prisma.purchaseRecord.create({
                data: {
                    store_id: store.id,
                    date: midWeek,
                    item_name: 'Picanha',
                    quantity: purchased,
                    cost_total: cost
                }
            });

            // 3. Consumption Logic
            // Simulate Guests
            const guests = 800 + Math.floor(Math.random() * 600);

            // Simulate Efficiency (Variance to 1.76 target)
            // Some weeks bad (2.0), some good (1.6)
            const efficiency = 1.6 + Math.random() * 0.5;
            const realConsumption = guests * efficiency;

            // 4. Final Inventory (Sunday)
            const endInv = (startInv + purchased) - realConsumption;

            await prisma.inventoryRecord.create({
                data: {
                    store_id: store.id,
                    date: end, // Logic uses "GTE" so this counts as end
                    item_name: 'Picanha',
                    quantity: Math.max(0, endInv)
                }
            });

            // 5. Save Guest Count (reusing Report hack or creating new mechanism if we had one)
            // We just create dummy orders to populate "Total Lbs" if needed by old logic,
            // but new logic uses Report table for guest count fallback.
            // Let's create a Report record for this week/month key
            await prisma.report.create({
                data: {
                    store_id: store.id,
                    month: reportKey,
                    total_lbs: realConsumption,
                    extra_customers: guests // Guest Count
                }
            });
        }
    }

    console.log('✅ History Planted. "Real" simulated data is live.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
