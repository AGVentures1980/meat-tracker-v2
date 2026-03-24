const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const outback = await prisma.company.findFirst({ where: { name: { contains: 'Outback' } } });
    if (!outback) return console.log('No outback');
    const stores = await prisma.store.findMany({ where: { company_id: outback.id }, include: { reports: true } });
    stores.forEach(s => {
        console.log(s.store_name, 'Reports count:', s.reports.length);
    });
}
check();
