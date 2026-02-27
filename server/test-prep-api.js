const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testApi() {
    console.log("Testing prep logs...");
    try {
        const store = await prisma.store.findUnique({
            where: { id: 1 },
            include: { meat_targets: true }
        });
        console.log("Store found:", store ? "Yes" : "No");

        const logs = await prisma.prepLog.findMany({
            where: { store_id: 1 },
            orderBy: { created_at: 'desc' },
            take: 3
        });

        console.log("Recent PrepLogs:");
        logs.forEach(l => {
            console.log(`- Date: ${l.date.toISOString().split('T')[0]}, Forecast: ${l.forecast}, Data Keys: ${Object.keys(l.data || {}).join(',')}`);
            if (l.data && l.data.prep_list) {
                console.log(`   prep_list length: ${l.data.prep_list.length}`);
            } else {
                console.log(`   prep_list is MISSING`);
            }
        });

    } catch (e) {
        console.error(e);
    } finally {
        prisma.$disconnect();
    }
}
testApi();
