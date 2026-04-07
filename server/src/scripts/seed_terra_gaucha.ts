import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Terra Gaucha for Demo Showcase...');
    
    // Find an admin user to own the company
    let admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!admin) {
         console.error("No admin user found to link company.");
         return;
    }

    // 1. Insert or Update the Terra Gaucha Company
    const company = await prisma.company.upsert({
        where: { subdomain: 'terra' },
        update: {
            name: 'Terra Gaucha',
            theme_primary_color: '#008751', // Flag Green
            theme_logo_url: 'https://terragaucha.com/wp-content/uploads/2024/08/logo-terra-final-11.svg',
            theme_bg_url: 'https://terragaucha.com/wp-content/uploads/2024/09/Deck-Terra-Site.mp4' 
        },
        create: {
            name: 'Terra Gaucha',
            owner_id: admin.id,
            plan: 'enterprise',
            subdomain: 'terra',
            theme_primary_color: '#008751',
            theme_logo_url: 'https://terragaucha.com/wp-content/uploads/2024/08/logo-terra-final-11.svg',
            theme_bg_url: 'https://terragaucha.com/wp-content/uploads/2024/09/Deck-Terra-Site.mp4'
        }
    });

    console.log(`Company generated: ${company.name}`);

    // 2. Create a flagship store for Terra Gaucha
    const store = await prisma.store.upsert({
        where: { company_id_store_name: { company_id: company.id, store_name: 'Terra Gaucha - Corporate' } },
        update: {},
        create: {
            company_id: company.id,
            store_name: 'Terra Gaucha - Corporate',
            location: 'Jacksonville, FL',
            target_lbs_guest: 1.76,
            target_cost_guest: 9.94,
            lunch_price: 35.00,
            dinner_price: 55.00,
            serves_lamb_chops_rodizio: false
        }
    });

    // 3. Insert User for Paulo Simonetti attached to the Store
    const hash = await bcrypt.hash('Terra2026@', 10);
    const user = await prisma.user.upsert({
        where: { email: 'paulo@terragaucha.com' },
        update: { 
            password_hash: hash, 
            store: { connect: { id: store.id } }, 
            first_name: 'Paulo', 
            last_name: 'Simonetti', 
            role: 'director' 
        },
        create: {
            email: 'paulo@terragaucha.com',
            password_hash: hash,
            store: { connect: { id: store.id } },
            first_name: 'Paulo',
            last_name: 'Simonetti',
            role: 'director',
            is_primary: true
        }
    });

    console.log(`\nDemo Credentials Prepared:`);
    console.log(`User: ${user.email}`);
    console.log(`Pass: Terra2026@`);
    console.log(`\nTo view theme locally: http://terra.localhost:5173`);
    console.log(`To view theme in PROD: https://terra.brasameat.com`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
