import { PrismaClient, CycleStatus, CycleType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting Texas de Brazil 90-Day Pilot Seeder...');

    // 1. Find Texas de Brazil Company
    const tdb = await prisma.company.findFirst({
        where: { name: { contains: 'Texas de Brazil', mode: 'insensitive' } }
    });

    if (!tdb) {
        console.error('❌ Could not find Texas de Brazil company');
        return;
    }

    console.log(`✅ Found Company: ${tdb.name} (ID: ${tdb.id})`);

    // 2. Find the 3 Pilot Stores
    const targetNames = ['addison', 'miami beach', 'las vegas'];
    const stores = await prisma.store.findMany({
        where: {
            company_id: tdb.id,
            OR: targetNames.map(name => ({
                store_name: { contains: name, mode: 'insensitive' }
            }))
        }
    });

    if (stores.length === 0) {
        console.error('❌ Could not find any of the target stores.');
        return;
    }

    console.log(`✅ Found ${stores.length} out of 3 target stores: ${stores.map(s => s.store_name).join(', ')}`);

    // 3. Update their baselines to match the Pitch Deck perfectly
    const pilotStartDate = new Date();
    pilotStartDate.setDate(pilotStartDate.getDate() - 90); // 90 days ago

    for (const store of stores) {
        await prisma.store.update({
            where: { id: store.id },
            data: {
                is_pilot: true,
                pilot_start_date: pilotStartDate,
                baseline_loss_rate: 20.0,
                baseline_yield_ribs: 74.0,
                baseline_yoy_pax: 1.88,
                baseline_trailing_pax: 1.88,
                baseline_forecast_accuracy: 62.0,
                baseline_overproduction: 18.0,
                baseline_cost_per_lb: 9.50,
                annual_volume_lbs: 250000 // $2.3M spend roughly at $9.5/lb
            }
        });
        console.log(`✅ Updated Baselines & Activated Pilot Status for: ${store.store_name}`);
    }

    // 4. Generate 90 Days of Fake Yield and Waste Data
    // We want to show a progressive improvement curve over 90 days.
    // Start: 20% loss, 74% yield. End: 17% loss, 77.7% yield.
    const meatItems = await prisma.companyProduct.findMany({
        where: { company_id: tdb.id }
    });

    if (meatItems.length === 0) {
        console.error('❌ No meat items found for TDB');
        return;
    }

    const picanha = meatItems.find(m => m.name.toLowerCase().includes('picanha')) || meatItems[0];

    console.log('⏳ Generating 90 days of rolling data for each store...');

    for (const store of stores) {
        // Clear old logs to ensure a clean chart
        await prisma.wasteLog.deleteMany({ where: { store_id: store.id } });
        await prisma.inventoryItem.deleteMany({ where: { cycle: { store_id: store.id } } });
        
        let currentDate = new Date(pilotStartDate);
        const today = new Date();

        let dayCount = 0;
        while (currentDate <= today) {
            // Calculate progressive improvement based on how far we are into the 90 days
            const progressRatio = Math.min(dayCount / 90, 1.0); // 0.0 to 1.0
            
            // Current Loss %: 20 -> 17
            const currentLoss = 20.0 - (3.0 * progressRatio) + (Math.random() * 0.5 - 0.25);
            
            // Current Yield %: 74 -> 77.7
            const currentYield = 74.0 + (3.7 * progressRatio) + (Math.random() * 1.0 - 0.5);

            // Insert daily waste log
            await prisma.wasteLog.create({
                data: {
                    store_id: store.id,
                    date: new Date(currentDate),
                    shift: 'PM', // added required field
                    input_by: 'Manager', // added required field
                    user_id: 'auto-seed', // added required field
                    items: [{ product_id: picanha.id, weight_lbs: 15 * (currentLoss / 20), reason: 'Trim/Fat' }], // added required items array structure
                    // The old code tried to put product_id and weight_lbs directly on WasteLog, but the schema uses `items: Json`
                }
            });

            // Insert weekly yield audit (every 7 days)
            if (dayCount % 7 === 0) {
                const cycle = await prisma.inventoryCycle.create({
                    data: {
                        store_id: store.id,
                        cycle_type: CycleType.WEEKLY,
                        start_date: new Date(currentDate),
                        end_date: new Date(currentDate),
                        status: CycleStatus.SUBMITTED
                    }
                });

                await prisma.inventoryItem.create({
                    data: {
                        cycle_id: cycle.id,
                        protein_id: picanha.id,
                        expected_lbs: 120, // Received
                        actual_lbs: 120 * (currentYield / 100) // Yield percent simulation via lbs difference
                    }
                });
            }

            currentDate.setDate(currentDate.getDate() + 1);
            dayCount++;
        }
        console.log(`📈 Embedded progressive 90-day curve for: ${store.store_name}`);
    }

    console.log('🎉 TDB Pilot Data Seeding Complete! The Executive Analyst will look incredible.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
