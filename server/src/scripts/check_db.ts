import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    const stores = await prisma.store.findMany({
        where: { company_id: 'tdb-main' },
        orderBy: { store_name: 'asc' }
    });
    console.log('Total Stores:', stores.length);

    const pilots = stores.filter(s => s.is_pilot);
    console.log('Current Active Pilots:', pilots.map(p => p.store_name).join(', '));

    if (stores.length > 0) {
        console.log('Sample Store Baseline Config:', {
            target_cost_guest: stores[0].target_cost_guest,
            target_lbs_guest: stores[0].target_lbs_guest,
            dinner_price: stores[0].dinner_price,
            baseline_loss_rate: stores[0].baseline_loss_rate
        });
    }
}

run().catch(console.error).finally(() => prisma.$disconnect());
