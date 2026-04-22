import { PrismaClient } from '@prisma/client';
import { subDays, startOfDay } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
    console.log("=== FIXING ATLANTIC CITY ===");

    // 1. Delete fake Sentinel Alert seed data
    console.log("Deleting fake SupportTickets...");
    const deleted = await prisma.supportTicket.deleteMany({
        where: {
            title: {
                contains: 'Ghost Math Anomaly'
            },
            created_at: {
                gte: new Date('2026-04-21T00:00:00Z'),
                lt: new Date('2026-04-22T00:00:00Z')
            }
        }
    });
    console.log(`Deleted ${deleted.count} fake SupportTickets.`);

    // 2. Fetch Atlantic City
    const acStore = await prisma.store.findUnique({
        where: { id: 1205 }
    });
    if (!acStore) {
        console.log("Atlantic City store (1205) not found!");
        return;
    }

    // 3. Seed IntelligenceSnapshot data for AC
    console.log("Seeding IntelligenceSnapshot for Atlantic City...");
    const now = new Date();
    
    for (let i = 0; i <= 7; i++) {
        const targetDate = startOfDay(subDays(now, i));
        
        await prisma.intelligenceSnapshot.upsert({
            where: {
                store_id_date: {
                    store_id: 1205,
                    date: targetDate
                }
            },
            update: {},
            create: {
                store_id: 1205,
                date: targetDate,
                expected_lbs: 220,
                actual_lbs: 200 + Math.random() * 40,
                discrepancy_lbs: Math.random() * 20 - 10,
                waste_lbs: Math.random() * 5,
                financial_impact: Math.random() * -100,
                status: 'WARNING'
            }
        });
    }

    console.log("Done seeding IntelligenceSnapshots for AC.");
}

main()
    .catch((e) => {
        console.error("FATAL ERROR", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
