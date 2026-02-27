const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPrep() {
    const logs = await prisma.prepLog.findMany({
        orderBy: { created_at: 'desc' },
        take: 3
    });
    console.log('--- LATEST PREP LOGS ---');
    console.log(JSON.stringify(logs, null, 2));
}

checkPrep()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
