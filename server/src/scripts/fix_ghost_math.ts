import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Enterprise Phase 5 Ghost Math Cleanup...");

    const hardRockStoreIds = [1202, 1203, 1204, 1205];
    
    const ghostDeleted = await prisma.supportTicket.deleteMany({
        where: {
            title: { contains: 'Ghost Math Anomaly' },
            store_id: { in: hardRockStoreIds }
        }
    });

    const fakeDeleted = await prisma.supportTicket.deleteMany({
        where: {
            store_id: { in: hardRockStoreIds },
            created_at: { lt: new Date('2026-04-22T00:00:00Z') }
        }
    });

    console.log(`Deleted ${ghostDeleted.count} explicitly named Ghost Math anomalies.`);
    console.log(`Deleted ${fakeDeleted.count} historical fake/seed anomalies.`);
    console.log(`Cleanup complete.`);
}

main()
    .catch((e) => {
        console.error("FATAL ERROR IN SCRIPT:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
