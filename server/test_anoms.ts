import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const tenant_id = '26e29999-5e6e-4022-bd85-17aec722655e';
    const lookbackDate = new Date(Date.now() - 7 * 86400000);
    const whereClause: any = {
        tenant_id,
        created_at: { gte: lookbackDate }
    };

    console.log("WHERE", JSON.stringify(whereClause, null, 2));
    const rawAnomalies = await prisma.anomalyEvent.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' }
    });
    console.log("Found", rawAnomalies.length, "raw anomalies");
    console.log(rawAnomalies);
}
run();
