const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const outback = await prisma.company.findFirst({
        where: { subdomain: 'outback' }
    });
    
    if (!outback) {
        console.log('Outback company not found.');
        return;
    }
    
    const stores = await prisma.store.findMany({
        where: { company_id: outback.id }
    });
    
    console.log(`Found ${stores.length} stores for Outback:`);
    
    const outletTypes = [
        { name: 'Main Kitchen (Grill)', type: 'KITCHEN' },
        { name: 'Prep Station', type: 'KITCHEN' },
        { name: 'To-Go / Delivery', type: 'RESTAURANT' },
        { name: 'Main Dining Room', type: 'RESTAURANT' },
        { name: 'Bar', type: 'BAR' }
    ];

    for (const store of stores) {
        console.log(`Seeding outlets for ${store.store_name}...`);
        
        await prisma.outlet.deleteMany({
            where: { store_id: store.id }
        });
        
        for (const ot of outletTypes) {
            const slug = `${store.store_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${ot.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
            await prisma.outlet.create({
                data: {
                    store_id: store.id,
                    company_id: outback.id,
                    name: ot.name,
                    slug: slug,
                    outlet_type: ot.type,
                    target_lbs_per_guest: 1.2
                }
            });
        }
    }
    console.log('Done seeding outlets for Outback!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
