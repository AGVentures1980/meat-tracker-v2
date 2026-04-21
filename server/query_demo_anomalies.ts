import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const store = await prisma.store.findFirst({ where: { store_name: { contains: 'Orlando', mode: 'insensitive' } }});
    if (!store) { console.log('No store Orlando'); return; }
    const anomalies = await prisma.anomalyEvent.findMany({ where: { store_id: store.id }});
    console.log(JSON.stringify(anomalies, null, 2));
}
run();
