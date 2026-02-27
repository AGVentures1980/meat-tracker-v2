const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLogs() {
    const logs = await prisma.auditLog.findMany({
        where: { action: { contains: 'NO_DELIVERY' } },
        orderBy: { created_at: 'desc' },
        take: 5
    });
    console.log('--- RECENT NO_DELIVERY LOGS ---');
    console.log(JSON.stringify(logs, null, 2));

    const todayDateStr = new Date().toISOString().split('T')[0];
    const [year, month, day] = todayDateStr.split('-').map(Number);
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    console.log('--- EXPECTED QUERY PERIOD (UTC) ---');
    console.log('Start:', startOfDay.toISOString());
    console.log('End:', endOfDay.toISOString());
}

checkLogs()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
