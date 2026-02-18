import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STORES = [
    { name: "DALLAS (MAIN)", deliveries: 45, volume: 1241, lastSync: "2 mins ago", status: "online" },
    { name: "FORT WORTH", deliveries: 32, volume: 890, lastSync: "5 mins ago", status: "online" },
    { name: "ADDISON", deliveries: 28, volume: 650, lastSync: "12 mins ago", status: "online" },
    { name: "AUSTIN", deliveries: 8, volume: 0, lastSync: "4 hours ago", status: "offline" },
    { name: "HOUSTON", deliveries: 62, volume: 1541, lastSync: "1 min ago", status: "online" },
    { name: "SAN ANTONIO", deliveries: 38, volume: 920, lastSync: "3 mins ago", status: "online" },
    { name: "DENVER", deliveries: 30, volume: 780, lastSync: "8 mins ago", status: "online" },
    { name: "MIAMI", deliveries: 5, volume: 0, lastSync: "2 days ago", status: "offline" },
    { name: "CHICAGO", deliveries: 42, volume: 1100, lastSync: "10 mins ago", status: "online" },
    { name: "LAS VEGAS", deliveries: 85, volume: 2101, lastSync: "15 mins ago", status: "online" }
];

async function main() {
    console.log('--- RESETTING CORE STORES ---');

    const firstCompany = await prisma.company.findFirst({ where: { id: 'tdb-main' } });
    if (!firstCompany) {
        console.error('tdb-main company not found.');
        return;
    }
    const companyId = firstCompany.id;

    for (const s of STORES) {
        console.log(`Processing ${s.name}...`);

        // Find or Create Store
        let store = await prisma.store.findFirst({
            where: { store_name: s.name, company_id: companyId }
        });

        if (!store) {
            store = await prisma.store.create({
                data: {
                    store_name: s.name,
                    company_id: companyId,
                    location: 'USA',
                    olo_sales_target: 10000
                }
            });
        }

        // Clear old delivery sales for this store
        await prisma.deliverySale.deleteMany({
            where: { store_id: store.id }
        });

        // Add the primary seed sale
        let date = new Date();
        if (s.lastSync.includes('min')) {
            date.setMinutes(date.getMinutes() - parseInt(s.lastSync));
        } else if (s.lastSync.includes('hour')) {
            date.setHours(date.getHours() - parseInt(s.lastSync));
        } else if (s.lastSync.includes('day')) {
            date.setDate(date.getDate() - parseInt(s.lastSync));
        }

        await prisma.deliverySale.create({
            data: {
                store_id: store.id,
                source: 'OLO',
                total_lbs: s.volume,
                guests: s.deliveries,
                amount: s.deliveries * 25.5, // Mock revenue
                protein_breakdown: [
                    { protein: "Picanha", lbs: s.volume * 0.4 },
                    { protein: "Fraldinha", lbs: s.volume * 0.3 },
                    { protein: "Chicken", lbs: s.volume * 0.3 }
                ] as any,
                date: date
            }
        });
    }

    console.log('--- SEEDING COMPLETE ---');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
