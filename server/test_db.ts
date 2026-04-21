import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const store = await prisma.store.findFirst({ where: { store_name: { contains: 'Orlando' } }});
    console.log("Store found:", store?.id);
    const anomalies = await prisma.anomalyEvent.findMany({ where: { store_id: store?.id } });
    console.log("Anomalies:", anomalies.length);
    console.log("First anomalous date:", anomalies[0]?.created_at);
}
run();
