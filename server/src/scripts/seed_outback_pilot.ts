import { PrismaClient, OperationType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting Outback Steakhouse 30-Day Pilot Seeder...');

    // 1. Create or Find Outback Steakhouse Company
    let outback = await prisma.company.findFirst({
        where: { name: { contains: 'Outback Steakhouse', mode: 'insensitive' } }
    });

    if (!outback) {
        console.log('🏢 Creating Outback Steakhouse HQ Record...');
        outback = await prisma.company.create({
            data: {
                name: 'Outback Steakhouse (Pilot)',
                operationType: OperationType.ALACARTE,
                plan: 'enterprise',
                subdomain: 'outback-pilot'
            }
        });
    } else {
        // Ensure it's set to ALACARTE
        await prisma.company.update({
            where: { id: outback.id },
            data: { operationType: OperationType.ALACARTE }
        });
        console.log(`✅ Found Company: ${outback.name} (ID: ${outback.id})`);
    }

    // 2. Define the "Ghost Math" Target Proteins & Portions
    const outbackProducts = [
        { name: 'Signature Sirloin 6oz', protein_group: 'Sirloin', is_villain: true, standard_target: 6.0 },
        { name: 'Signature Sirloin 8oz', protein_group: 'Sirloin', is_villain: true, standard_target: 8.0 },
        { name: 'Signature Sirloin 11oz', protein_group: 'Sirloin', is_villain: true, standard_target: 11.0 },
        { name: 'Victoria Filet 6oz', protein_group: 'Filet', is_villain: true, standard_target: 6.0 },
        { name: 'Victoria Filet 8oz', protein_group: 'Filet', is_villain: true, standard_target: 8.0 },
        { name: 'Ribeye 10oz', protein_group: 'Ribeye', is_villain: true, standard_target: 10.0 },
        { name: 'Ribeye 13oz', protein_group: 'Ribeye', is_villain: true, standard_target: 13.0 },
        { name: 'Bone-in Ribeye 18oz', protein_group: 'Ribeye', is_villain: false, standard_target: 18.0 },
        { name: 'Melbourne Porterhouse 22oz', protein_group: 'Porterhouse', is_villain: false, standard_target: 22.0 },
        { name: 'Bloomin Onion (Colossal)', protein_group: 'Produce', is_villain: false, standard_target: 1.0 }, // 1 unit
        { name: 'Alice Springs Chicken 8oz', protein_group: 'Chicken', is_villain: false, standard_target: 8.0 }
    ];

    console.log('⏳ Seeding Outback Menu Portions...');
    for (const prod of outbackProducts) {
        await prisma.companyProduct.upsert({
            where: {
                company_id_name: {
                    company_id: outback.id,
                    name: prod.name
                }
            },
            update: {
                protein_group: prod.protein_group,
                is_villain: prod.is_villain,
                standard_target: prod.standard_target
            },
            create: {
                company_id: outback.id,
                name: prod.name,
                protein_group: prod.protein_group,
                is_villain: prod.is_villain,
                standard_target: prod.standard_target
            }
        });
    }

    // 3. Create a Pilot Store
    let store = await prisma.store.findFirst({
        where: { store_name: 'Outback - Dallas Pilot', company_id: outback.id }
    });

    if (!store) {
        store = await prisma.store.create({
            data: {
                id: 9991, // Bypass sequence issues
                company_id: outback.id,
                store_name: 'Outback - Dallas Pilot',
                location: 'Dallas, TX',
                is_pilot: true,
                pilot_start_date: new Date(),
                is_lunch_enabled: true,
                lunch_start_time: '11:00',
                lunch_end_time: '16:00',
                dinner_start_time: '16:00',
                dinner_end_time: '22:00',
                baseline_loss_rate: 6.5, // 6.5% standard variance
            }
        });
        console.log(`✅ Created Store: ${store.store_name}`);
    } else {
        console.log(`✅ Found Store: ${store.store_name}`);
    }

    // 4. Create Users (Managing Partner & JVP)
    const jvpEmail = 'jvp.dallas@outback.com';
    const mpEmail = 'mp.dallas1@outback.com';

    await prisma.user.upsert({
        where: { email: jvpEmail },
        update: { role: 'director', director_region: 'Dallas Metro' },
        create: {
            email: jvpEmail,
            first_name: 'John',
            last_name: 'JVP',
            password_hash: '$2b$10$xyz', // Dummy hash
            role: 'director',
            director_region: 'Dallas Metro'
        }
    });

    await prisma.user.upsert({
        where: { email: mpEmail },
        update: { store_id: store.id, role: 'manager' },
        create: {
            email: mpEmail,
            first_name: 'Mike',
            last_name: 'MP',
            password_hash: '$2b$10$xyz', // Dummy hash
            role: 'manager',
            store_id: store.id
        }
    });

    console.log('🎉 Outback Pilot Seeding Complete! Ready for the 30-Day Ghost Math Challenge.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
