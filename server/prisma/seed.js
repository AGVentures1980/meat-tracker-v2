const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting Seed...');

    console.log('🌱 Starting Seed...');

    // 1. Create Main Company (Upsert)
    const tdb = await prisma.company.upsert({
        where: { id: 'tdb-main' },
        update: {},
        create: {
            id: 'tdb-main',
            name: 'Texas de Brazil',
            plan: 'enterprise'
        }
    });

    console.log(`Created Company: ${tdb.name}`);

    // 2. Create Master User (Upsert)
    await prisma.user.upsert({
        where: { email: 'alexandre@alexgarciaventures.co' },
        update: {},
        create: {
            email: 'alexandre@alexgarciaventures.co',
            password_hash: 'Ag2113@9',
            role: 'admin'
        }
    });

    // 3. Create Real Stores for BI
    const stores = [
        { id: 180, name: 'Tampa', location: 'FL' },
        { id: 181, name: 'Orlando', location: 'FL' },
        { id: 182, name: 'Miami Beach', location: 'FL' },
        { id: 183, name: 'Las Vegas', location: 'NV' },
        { id: 184, name: 'Dallas', location: 'TX' },
        { id: 185, name: 'Chicago', location: 'IL' },
        { id: 168, name: 'Wayne', location: 'NJ' }
    ];

    for (const s of stores) {
        // Upsert store
        const store = await prisma.store.upsert({
            where: { id: s.id },
            update: {},
            create: {
                id: s.id,
                company_id: tdb.id,
                store_name: s.name,
                location: s.location
            }
        });

        console.log(`Seeding data for ${s.name}...`);

        // Simulating "Last Week" Data for BI Calculations
        // Formula: Consumption = (Start Inv + Purchases) - End Inv
        const now = new Date();
        const lastWeek = new Date(now);
        lastWeek.setDate(now.getDate() - 7);

        // 1. Initial Inventory (Last Week)
        const startInv = 200 + Math.random() * 100; // Random start
        await prisma.inventoryRecord.create({
            data: {
                store_id: store.id,
                date: lastWeek,
                item_name: 'Picanha',
                quantity: startInv
            }
        });

        // 2. Purchases during the week
        const purchased = 500 + Math.random() * 200;
        await prisma.purchaseRecord.create({
            data: {
                store_id: store.id,
                date: new Date(now.getDate() - 3), // Mid-week purchase
                item_name: 'Picanha',
                quantity: purchased,
                cost_total: purchased * (5.50 + Math.random()) // Random cost ~$6/lb
            }
        });

        // 3. Final Inventory (Today)
        // We want consumption to be roughly 1.8 lbs/guest
        const guests = 1000 + Math.floor(Math.random() * 500);
        const targetConsumption = guests * 1.8;

        // Real Consumption (add some variance)
        const realConsumption = targetConsumption * (0.9 + Math.random() * 0.2); // +/- 10%

        const endInv = (startInv + purchased) - realConsumption;

        await prisma.inventoryRecord.create({
            data: {
                store_id: store.id,
                date: now,
                item_name: 'Picanha',
                quantity: Math.max(0, endInv) // Ensure distinct non-negative
            }
        });

        // 4. Create Mock Guests (via Order/Report hack for now, or just trust the BI engine will calculate)
        // For V2, let's create a Report entry to store the Guest Count easily
        await prisma.report.create({
            data: {
                store_id: store.id,
                month: '2026-02-BI-WEEK', // Mock identifier
                total_lbs: realConsumption,
                extra_customers: guests // Hijacking this field for "Guest Count" for simplicity in this iteration
            }
        });
    }

    console.log('✅ Seed Completed with REAL BI Data for Network!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
