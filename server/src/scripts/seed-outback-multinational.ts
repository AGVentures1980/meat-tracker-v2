import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('[Seed] Syncing Postgres Sequences...');
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Store"', 'id'), coalesce(max(id),0) + 1, false) FROM "Store";`);
    console.log('[Seed] Starting Outback Multinational Pitch Environment...');

    // 1. Ensure Outback Company Exists
    let outback = await prisma.company.findFirst({
        where: { name: { contains: 'Outback Steakhouse', mode: 'insensitive' } }
    });

    if (!outback) {
        throw new Error("Outback Company not found! Ensure main seed runs first.");
    }

    console.log(`[Seed] Found Outback Company ID: ${outback.id}`);

    // 2. Define the 10 Strategic Stores (5 US, 5 BR)
    const storeData = [
        // --- USA STORES ---
        { name: 'Outback - Orlando (I-Drive)', location: 'Orlando, FL', country: 'USA', region: 'USA', tz: 'America/New_York' },
        { name: 'Outback - Miami Beach', location: 'Miami, FL', country: 'USA', region: 'USA', tz: 'America/New_York' },
        { name: 'Outback - Dallas (Plano)', location: 'Dallas, TX', country: 'USA', region: 'USA', tz: 'America/Chicago' },
        { name: 'Outback - Las Vegas Strip', location: 'Las Vegas, NV', country: 'USA', region: 'USA', tz: 'America/Los_Angeles' },
        { name: 'Outback - New York (Times Sq)', location: 'New York, NY', country: 'USA', region: 'USA', tz: 'America/New_York' },
        
        // --- BRAZIL STORES ---
        { name: 'Outback - Shopping Center Norte', city: 'São Paulo', location: 'São Paulo, SP', country: 'Brazil', region: 'Brazil', tz: 'America/Sao_Paulo' },
        { name: 'Outback - BarraShopping', city: 'Rio de Janeiro', location: 'Rio de Janeiro, RJ', country: 'Brazil', region: 'Brazil', tz: 'America/Sao_Paulo' },
        { name: 'Outback - BH Shopping', city: 'Belo Horizonte', location: 'Belo Horizonte, MG', country: 'Brazil', region: 'Brazil', tz: 'America/Sao_Paulo' },
        { name: 'Outback - Parque D. Pedro', city: 'Campinas', location: 'Campinas, SP', country: 'Brazil', region: 'Brazil', tz: 'America/Sao_Paulo' },
        { name: 'Outback - Iguatemi Brasilia', city: 'Brasília', location: 'Brasília, DF', country: 'Brazil', region: 'Brazil', tz: 'America/Sao_Paulo' },
    ];

    const createdStores: Record<string, any> = {};

    for (const data of storeData) {
        let store = await prisma.store.findFirst({
            where: { store_name: data.name, company_id: outback.id }
        });

        if (!store) {
            store = await prisma.store.create({
                data: {
                    company_id: outback.id,
                    store_name: data.name,
                    location: data.location,
                    country: data.country,
                    city: data.city || null,
                    region: data.region,
                    timezone: data.tz,
                    is_pilot: true,
                    pilot_start_date: new Date(),
                    is_lunch_enabled: true,
                    lunch_start_time: '11:00',
                    lunch_end_time: '16:00',
                    dinner_start_time: '16:00',
                    dinner_end_time: '22:00',
                    baseline_loss_rate: 6.5
                }
            });
            console.log(`[Seed] Created Store: ${data.name}`);
        } else {
            console.log(`[Seed] Store exists: ${data.name}`);
        }
        createdStores[data.name] = store;
    }

    // 3. Create the Users (RBAC Hierarchy)
    const passwordHash = await bcrypt.hash('Outback2026@', 10);

    const users = [
        // C-Level Global
        { 
            email: 'global.ceo@outback.com', 
            first_name: 'Global', 
            last_name: 'VP', 
            role: 'director', 
            region: null, // No region restriction = sees all
            company_id: outback.id
        },
        // US Operations
        { 
            email: 'us.director@outback.com', 
            first_name: 'US', 
            last_name: 'Director', 
            role: 'director', 
            region: 'USA', 
            company_id: outback.id
        },
        { 
            email: 'us.east.am@outback.com', 
            first_name: 'East', 
            last_name: 'AM', 
            role: 'area_manager', 
            stores: ['Outback - Orlando (I-Drive)', 'Outback - Miami Beach', 'Outback - New York (Times Sq)'],
            company_id: outback.id
        },
        { 
            email: 'us.west.am@outback.com', 
            first_name: 'West', 
            last_name: 'AM', 
            role: 'area_manager', 
            stores: ['Outback - Dallas (Plano)', 'Outback - Las Vegas Strip'],
            company_id: outback.id
        },
        // Brazil Operations
        { 
            email: 'br.director@outback.com', 
            first_name: 'Brazil', 
            last_name: 'Director', 
            role: 'director', 
            region: 'Brazil', 
            company_id: outback.id
        },
        { 
            email: 'br.sp.am@outback.com', 
            first_name: 'SP', 
            last_name: 'AM', 
            role: 'area_manager', 
            stores: ['Outback - Shopping Center Norte', 'Outback - Parque D. Pedro'],
            company_id: outback.id
        },
        { 
            email: 'br.regional.am@outback.com', 
            first_name: 'Regional', 
            last_name: 'AM', 
            role: 'area_manager', 
            stores: ['Outback - BarraShopping', 'Outback - BH Shopping', 'Outback - Iguatemi Brasilia'],
            company_id: outback.id
        }
    ];

    for (const u of users) {
        let user = await prisma.user.findUnique({ where: { email: u.email } });
        
        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: u.email,
                    first_name: u.first_name,
                    last_name: u.last_name,
                    password_hash: passwordHash,
                    role: u.role as any,
                    director_region: u.region,
                    is_primary: true
                }
            });
            console.log(`[Seed] Created User: ${u.email} (${u.role})`);
        } else {
            console.log(`[Seed] User exists: ${u.email}`);
        }

        // Link AMs to stores
        if (u.role === 'area_manager' && u.stores) {
            const storeIds = u.stores.map(name => ({ id: createdStores[name].id }));
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    area_stores: {
                        set: storeIds
                    }
                }
            });
            console.log(`[Seed] Linked ${storeIds.length} stores to ${u.email}`);
        }
    }

    console.log('[Seed] Outback Multinational Environment Seed Complete!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
