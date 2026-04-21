import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🎸 ------------------------------------------ 🎸');
    console.log('🔥 INITIATING HARD ROCK DEMO SEEDER');
    console.log('🎸 ------------------------------------------ 🎸\n');

    // 1. Ensure Hard Rock Company exists
    let hardrock = await prisma.company.findFirst({
        where: { subdomain: 'hardrock' }
    });

    if (!hardrock) {
        hardrock = await prisma.company.create({
            data: {
                name: 'Hard Rock Hotel & Casino',
                operationType: 'ALACARTE', // Hard Rock is A La Carte
                plan: 'enterprise',
                subdomain: 'hardrock',
                theme_primary_color: '#c52828', // Hard Rock Red
                theme_logo_url: '/hardrock_logo.png', 
                theme_bg_url: '/hardrock-bg.png' 
            }
        });
        console.log(`[+] Created Hard Rock Company (ID: ${hardrock.id})`);
    } else {
        hardrock = await prisma.company.update({
            where: { id: hardrock.id },
            data: { 
                name: 'Hard Rock Hotel & Casino',
                theme_primary_color: '#c52828',
                theme_logo_url: '/hardrock_logo.png',
                theme_bg_url: '/hardrock-bg.png'
            }
        });
        console.log(`[~] Updated Hard Rock Company settings (ID: ${hardrock.id})`);
    }

    const cid = hardrock.id;

    // 3. Setup Hard Rock Stores
    const stores = [
        { name: 'Tampa Casino', loc: '5223 Orient Rd, Tampa, FL 33610' },
        { name: 'Hollywood', loc: '1 Seminole Way, Hollywood, FL 33314' },
        { name: 'Punta Cana', loc: 'Bd. Turístico del Este, Punta Cana 23000, DO' }
    ];

    const createdStores = [];
    for (const s of stores) {
        let store = await prisma.store.findFirst({
            where: { store_name: s.name, company_id: cid }
        });
        if (!store) {
            store = await prisma.store.create({
                data: {
                    company_id: cid,
                    store_name: s.name,
                    location: s.loc,
                    is_pilot: true,
                    pilot_start_date: new Date()
                }
            });
        }
        createdStores.push(store);
    }
    console.log(`[+] Seeded ${createdStores.length} Stores. Primary Pilot: ${createdStores[0].store_name}`);

    // 4. Create the User Hierarchy 
    const password = await bcrypt.hash('Hardrock2026@', 10);
    
    // The Director (sees ALL stores)
    await prisma.user.upsert({
        where: { email: 'tampa@hardrock.com' },
        update: { role: 'director', is_primary: true, password_hash: password },
        create: {
            email: 'tampa@hardrock.com',
            first_name: 'Tampa',
            last_name: 'Director',
            password_hash: password,
            role: 'director',
            is_primary: true,
            company_id: cid
        }
    });

    console.log(`[+] Seeded Admin: tampa@hardrock.com (Role: Director)`);

    console.log('\n✅ Hard Rock Tenant Provisioning Complete!');
}

main()
    .catch((e) => {
        console.error("FATAL ERROR IN SEEDER", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
