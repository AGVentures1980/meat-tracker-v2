const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function bootstrapTerraGaucha() {
    console.log('🚀 Bootstrapping Pristine Environment for Terra Gaucha Pilot...');

    // 1. Create Terra Gaucha Company (Clean Slate)
    let terraGaucha = await prisma.company.findFirst({
        where: { name: { contains: 'Terra Gaucha', mode: 'insensitive' } }
    });

    if (!terraGaucha) {
        terraGaucha = await prisma.company.create({
            data: {
                name: 'Terra Gaucha',
                subdomain: 'terra'
            }
        });
    }

    console.log(`✅ Company Configured: ${terraGaucha.name}`);

    // 2. Create the Flagship Pilot Store (Stamford)
    const stamfordStore = await prisma.store.upsert({
        where: {
            company_id_store_name: {
                company_id: terraGaucha.id,
                store_name: 'Stamford'
            }
        },
        update: { target_lbs_guest: 1.85, data_type: 'DEMO' },
        create: {
            id: 9001, // Custom explicit ID to avoid conflicts
            company_id: terraGaucha.id,
            store_name: 'Stamford',
            location: 'USA',
            target_lbs_guest: 1.85,
            data_type: 'DEMO'
        }
    });

    console.log(`✅ Flagship Store Configured: ${stamfordStore.store_name} (ID: ${stamfordStore.id})`);

    // 3. Create the Executive User (Paulo Simonetti)
    const hashedPassword = await bcrypt.hash('Terra2026!', 10);
    const paulo = await prisma.user.upsert({
        where: { email: 'paulo@terragaucha.com' },
        update: {
            password_hash: hashedPassword,
            role: 'admin',
            first_name: 'Paulo',
            last_name: 'Simonetti',
            company_id: terraGaucha.id
        },
        create: {
            email: 'paulo@terragaucha.com',
            password_hash: hashedPassword,
            role: 'admin',
            first_name: 'Paulo',
            last_name: 'Simonetti',
            force_change: false,
            last_password_change: new Date(),
            company_id: terraGaucha.id
        }
    });

    console.log(`✅ Executive Access Granted: ${paulo.email} (Role: ${paulo.role})`);

    console.log('🎯 Terra Gaucha Minimum Operational Configuration is LIVE.');
}

bootstrapTerraGaucha()
    .catch((e) => {
        console.error('❌ Bootstrap Failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
