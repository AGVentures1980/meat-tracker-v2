import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    console.log('Resetting all pilot flags...');
    await prisma.store.updateMany({
        where: { company_id: 'tdb-main' },
        data: { is_pilot: false }
    });

    const pilotNames = ['Las Vegas', 'Tampa', 'Miami Beach'];
    let updated = 0;

    for (const name of pilotNames) {
        const res = await prisma.store.updateMany({
            where: {
                company_id: 'tdb-main',
                store_name: { equals: name, mode: 'insensitive' }
            },
            data: { is_pilot: true }
        });
        updated += res.count;
        console.log(`Set ${name} to pilot. Applied to ${res.count} records.`);
    }

    console.log(`Total Pilot Flags Set: ${updated}`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
