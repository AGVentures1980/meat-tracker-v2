
import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';
const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Preparing "Global CEO" Environment for Outback Demo...');

    // 1. Create/Update the Outback Company
    const bloomin = await (prisma.company as any).upsert({
        where: { subdomain: 'outback' },
        update: {
            name: 'Bloomin\' Brands',
            theme_primary_color: '#8B0000',
            theme_logo_url: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/05/Outback_Steakhouse_logo.svg/1200px-Outback_Steakhouse_logo.svg.png',
            theme_bg_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80',
            plan: 'enterprise',
            operationType: 'ALACARTE'
        },
        create: {
            name: 'Bloomin\' Brands',
            subdomain: 'outback',
            theme_primary_color: '#8B0000',
            theme_logo_url: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/05/Outback_Steakhouse_logo.svg/1200px-Outback_Steakhouse_logo.svg.png',
            theme_bg_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80',
            plan: 'enterprise',
            operationType: 'ALACARTE'
        }
    });

    // 2. Create the "Global CEO" User
    const passwordHash = await bcryptjs.hash('Outback2026@', 10);
    const ceo = await prisma.user.upsert({
        where: { email: 'global.ceo@outback.com' },
        update: {
            company_id: bloomin.id,
            role: 'admin', // Full access for the demo
            first_name: 'Global',
            last_name: 'CEO',
            password_hash: passwordHash,
            is_primary: true
        },
        create: {
            email: 'global.ceo@outback.com',
            company_id: bloomin.id,
            role: 'admin',
            first_name: 'Global',
            last_name: 'CEO',
            password_hash: passwordHash,
            is_primary: true
        }
    });

    console.log(`✅ User ${ceo.email} is ready for login.`);

    // 3. Ensure a few stores exist so the dashboard isn't empty
    const stores = ['Outback Tampa', 'Outback Houston', 'Outback NYC'];
    for (const name of stores) {
        await (prisma.store as any).upsert({
            where: { 
                company_id_store_name: {
                    company_id: bloomin.id,
                    store_name: name
                }
            },
            update: { status: 'ACTIVE' },
            create: {
                store_name: name,
                location: 'USA',
                company_id: bloomin.id,
                status: 'ACTIVE'
            }
        });
    }

    console.log('✨ Demo Environment fully operational. You can now login at outback.brasameat.com');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
