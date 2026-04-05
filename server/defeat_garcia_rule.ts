import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'addison@texasdebrazil.com' }
    });

    if (!user || !user.store_id) {
        console.error('User addison@texasdebrazil.com not found or has no store!');
        process.exit(1);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Insert a dummy waste log for today's lunch or dinner
    await prisma.wasteLog.upsert({
        where: {
            store_id_date_shift: {
                store_id: user.store_id,
                date: today,
                shift: 'Dinner'
            }
        },
        update: {},
        create: {
            store_id: user.store_id,
            date: today,
            shift: 'Dinner',
            input_by: 'Addison Demo',
            user_id: user.id,
            items: [{ "name": "Filet Mignon", "lbs": 1.2 }]
        }
    });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    await prisma.wasteLog.upsert({
        where: {
            store_id_date_shift: {
                store_id: user.store_id,
                date: yesterday,
                shift: 'Dinner'
            }
        },
        update: {},
        create: {
            store_id: user.store_id,
            date: yesterday,
            shift: 'Dinner',
            input_by: 'Addison Demo',
            user_id: user.id,
            items: [{ "name": "Filet Mignon", "lbs": 1.2 }]
        }
    });

    console.log('Waste logs injected for Addison to defeat the Garcia Rule.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
