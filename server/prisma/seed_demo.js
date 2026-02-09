const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Demo Playground Setup Script (Production Version)
 * Creates a dedicated "Demo Company" with synthetic stores and data
 * to ensure trial users never see real client information.
 * 
 * Usage on Railway: node prisma/seed_demo.js
 */

async function main() {
    console.log('🎭 Setting up Demo Playground...\n');

    // 1. Create Demo Company
    const demoCompany = await prisma.company.upsert({
        where: { id: 'demo-playground-agv' },
        update: {},
        create: {
            id: 'demo-playground-agv',
            name: 'AGV Demo Playground',
            plan: 'trial'
        }
    });

    console.log('✅ Demo Company Created:', demoCompany.name);

    // 2. Create Demo Stores
    const demoStores = [
        { name: 'Demo - North Dallas', location: 'Dallas, TX', target_lbs_guest: 1.76, target_cost_guest: 9.94 },
        { name: 'Demo - Miami Beach', location: 'Miami, FL', target_lbs_guest: 1.80, target_cost_guest: 10.20 },
        { name: 'Demo - Manhattan', location: 'New York, NY', target_lbs_guest: 1.72, target_cost_guest: 9.50 },
    ];

    for (const storeData of demoStores) {
        const store = await prisma.store.upsert({
            where: {
                company_id_store_name: {
                    company_id: demoCompany.id,
                    store_name: storeData.name
                }
            },
            update: {},
            create: {
                company_id: demoCompany.id,
                store_name: storeData.name,
                location: storeData.location,
                target_lbs_guest: storeData.target_lbs_guest,
                target_cost_guest: storeData.target_cost_guest
            }
        });

        console.log(`  📍 Demo Store Created: ${store.store_name} (ID: ${store.id})`);

        // 3. Generate Synthetic Meat Usage Data (Last 4 weeks)
        // Note: Using native Date manipulation to avoid date-fns dependency issues if not installed
        const proteins = ['Picanha', 'Fraldinha', 'Alcatra', 'Cordeiro', 'Linguica'];
        const today = new Date();

        for (let week = 0; week < 4; week++) {
            const weekDate = new Date(today);
            weekDate.setDate(today.getDate() - (week * 7));

            for (const protein of proteins) {
                const randomLbs = Math.random() * 200 + 100; // 100-300 lbs

                await prisma.meatUsage.upsert({
                    where: {
                        store_id_protein_date: {
                            store_id: store.id,
                            protein,
                            date: weekDate
                        }
                    },
                    update: {},
                    create: {
                        store_id: store.id,
                        protein,
                        lbs_total: parseFloat(randomLbs.toFixed(2)),
                        date: weekDate
                    }
                });
            }
        }

        console.log(`    🥩 Synthetic meat usage data generated for ${store.store_name}`);
    }

    console.log('\n✨ Demo Playground Setup Complete!\n');
    console.log('Trial users will now be assigned to these demo stores.');
}

main()
    .catch((e) => {
        console.error('❌ Error setting up Demo Playground:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
