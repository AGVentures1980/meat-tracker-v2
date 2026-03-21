const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const logs = await prisma.prepLog.findMany({ orderBy: { created_at: 'desc' }, take: 5 });
    console.log(logs.map(l => ({ store_id: l.store_id, date: l.date, forecast: l.forecast, created: l.created_at })));
}
main().finally(() => prisma.$disconnect());
