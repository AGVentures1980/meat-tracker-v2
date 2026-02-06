import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting Seed...');

    // 0. Clean up
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.user.deleteMany();
    await prisma.store.deleteMany();
    await prisma.company.deleteMany();

    // 1. Create Main Company
    const tdb = await prisma.company.create({
        data: {
            name: 'Texas de Brazil',
            plan: 'enterprise'
        }
    });

    console.log(`Created Company: ${tdb.name}`);

    // 2. Create Master User
    await prisma.user.create({
        data: {
            email: 'alexandre@alexgarciaventures.co',
            password_hash: 'Ag2113@9',
            role: 'admin'
        }
    });

    // 3. Create Example Store (Tampa) with ID 180
    const tampa = await prisma.store.create({
        data: {
            id: 180,
            company_id: tdb.id,
            store_name: "Tampa",
            location: "FL",
        }
    });

    // 4. Create User for Tampa
    await prisma.user.create({
        data: {
            email: "tampa@texasdebrazil.com",
            password_hash: "TDB-Tampa-180",
            role: "manager",
            store_id: tampa.id
        }
    });

    // 5. Create Mock Orders for Meat Engine
    const today = new Date();

    // Create 5 days of sales
    for (let i = 0; i < 5; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i); // Go back i days

        const order = await prisma.order.create({
            data: {
                store_id: tampa.id,
                source: 'Manual',
                order_date: date
            }
        });

        // Add Picanha
        await prisma.orderItem.create({
            data: {
                order_id: order.id,
                item_name: 'Picanha',
                protein_type: 'Beef',
                lbs: 45.5 + (i * 2) // Varying amounts
            }
        });

        // Add Lamb
        await prisma.orderItem.create({
            data: {
                order_id: order.id,
                item_name: 'Lamb Chops',
                protein_type: 'Lamb',
                lbs: 12.0 + i
            }
        });
    }

    console.log('✅ Seed Completed with Sales Data!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
