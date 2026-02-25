import { PrismaClient, OrderSource, CycleType, CycleStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Target Stores for 14-Day Pilot Pitch
const PILOT_STORES = [
    { name: "DALLAS (MAIN)", state: "compliant" },
    { name: "FORT WORTH", state: "offline_sync_pending" },
    { name: "ADDISON", state: "garcia_rule_lockout" }
];

const START_DATE = new Date();
START_DATE.setDate(START_DATE.getDate() - 14); // 14 days ago

// Proteins
const PROTEINS = ['Picanha', 'Fraldinha', 'Lamb Chops', 'Chicken'];

async function getOrCreateCompany() {
    let company = await prisma.company.findFirst({ where: { name: 'Texas de Brazil' } });
    if (!company) {
        company = await prisma.company.create({
            data: {
                name: 'Texas de Brazil',
                plan: 'enterprise'
            }
        });
    }

    // Ensure we have products
    for (const p of PROTEINS) {
        await prisma.companyProduct.upsert({
            where: { company_id_name: { company_id: company.id, name: p } },
            update: {},
            create: {
                company_id: company.id,
                name: p,
                protein_group: p,
                category: 'Beef',
                is_villain: p === 'Picanha' || p === 'Lamb Chops'
            }
        });
    }

    return company;
}

async function getOrCreateStores(companyId: string) {
    const createdStores = [];
    for (const s of PILOT_STORES) {
        let store = await prisma.store.findFirst({
            where: { store_name: s.name, company_id: companyId }
        });

        if (!store) {
            store = await prisma.store.create({
                data: {
                    store_name: s.name,
                    company_id: companyId,
                    location: 'USA',
                    is_pilot: true,
                    pilot_start_date: START_DATE
                }
            });
        } else {
            // make sure it's tagged as pilot
            await prisma.store.update({
                where: { id: store.id },
                data: { is_pilot: true, pilot_start_date: START_DATE }
            });
        }
        createdStores.push({ ...store, state: s.state });
    }
    return createdStores;
}

async function cleanData(storeIds: number[]) {
    console.log('Cleaning old data for pilot stores...');
    await prisma.deliverySale.deleteMany({ where: { store_id: { in: storeIds } } });
    await prisma.meatUsage.deleteMany({ where: { store_id: { in: storeIds } } });
    await prisma.wasteLog.deleteMany({ where: { store_id: { in: storeIds } } });
    await prisma.salesForecast.deleteMany({ where: { store_id: { in: storeIds } } });

    const cycles = await prisma.inventoryCycle.findMany({ where: { store_id: { in: storeIds } } });
    const cycleIds = cycles.map(c => c.id);
    await prisma.inventoryItem.deleteMany({ where: { cycle_id: { in: cycleIds } } });
    await prisma.inventoryCycle.deleteMany({ where: { store_id: { in: storeIds } } });
}

async function seed14Days(companyId: string, store: any, products: any[]) {
    console.log(`Seeding 14 days for ${store.store_name} (${store.state})`);

    let baseLbsPerGuest = 1.95; // Starting point (bad)
    const targetLbsPerGuest = 1.76;

    // Gradual improvement in food cost (lbs per guest) over 14 days
    const improvementRate = (baseLbsPerGuest - targetLbsPerGuest) / 14;

    for (let i = 0; i < 14; i++) {
        const currentDate = new Date(START_DATE);
        currentDate.setDate(currentDate.getDate() + i);

        const guests = Math.floor(Math.random() * 200) + 100; // 100-300 guests
        const currentLbsPerGuest = baseLbsPerGuest - (improvementRate * i);
        const totalLbs = guests * currentLbsPerGuest;

        // Random usage based on total LBS
        await prisma.meatUsage.create({
            data: {
                store_id: store.id,
                protein: "Picanha",
                lbs_total: totalLbs * 0.4,
                date: currentDate
            }
        });

        await prisma.deliverySale.create({
            data: {
                store_id: store.id,
                source: OrderSource.OLO,
                total_lbs: totalLbs * 0.1, // 10% delivery
                guests: Math.floor(guests * 0.1),
                date: currentDate,
                protein_breakdown: [
                    { protein: "Picanha", lbs: totalLbs * 0.04 },
                    { protein: "Chicken", lbs: totalLbs * 0.06 }
                ]
            }
        });

        // Seed WasteLog for Garcia Rule compliance check
        // The Garcia Rule ensures we have waste logs for high value items ("villains")
        if (store.state === 'compliant' || (store.state === 'garcia_rule_lockout' && i < 13)) {
            // 75% compliance chance daily for regular days
            if (Math.random() > 0.25) {
                await prisma.wasteLog.create({
                    data: {
                        store_id: store.id,
                        date: currentDate,
                        shift: "DINNER",
                        input_by: "System Seed",
                        user_id: "seed-user",
                        items: [
                            { protein: "Picanha", status: "Counted", amount: 12.5 },
                            { protein: "Lamb Chops", status: "Counted", amount: 5.2 }
                        ]
                    }
                });
            }
        }

    }

    // Handle Weekly Inventory Cycle for Garcia Rule Lockout (Sunday 10PM)
    const lastSunday = new Date();
    lastSunday.setDate(lastSunday.getDate() - lastSunday.getDay());
    lastSunday.setHours(0, 0, 0, 0);

    const cycleStatus = store.state === 'garcia_rule_lockout' ? CycleStatus.PENDING : CycleStatus.SUBMITTED;

    const cycle = await prisma.inventoryCycle.create({
        data: {
            store_id: store.id,
            cycle_type: CycleType.WEEKLY,
            start_date: lastSunday,
            end_date: lastSunday, // simplify for seed
            status: cycleStatus
        }
    });

    for (const p of products) {
        await prisma.inventoryItem.create({
            data: {
                cycle_id: cycle.id,
                protein_id: p.id,
                expected_lbs: 100,
                actual_lbs: store.state === 'garcia_rule_lockout' ? 0 : 98,
                variance_lbs: store.state === 'garcia_rule_lockout' ? 0 : -2
            }
        });
    }

}

async function main() {
    console.log('--- STARTING 14-DAY PILOT SEED ---');
    const company = await getOrCreateCompany();
    const stores = await getOrCreateStores(company.id);
    const products = await prisma.companyProduct.findMany({ where: { company_id: company.id } });

    await cleanData(stores.map(s => s.id));

    for (const s of stores) {
        await seed14Days(company.id, s, products);
    }

    console.log('--- SEEDING COMPLETE ---');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
