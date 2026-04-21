import { PrismaClient } from '@prisma/client';
import { RecommendationEngine } from './src/services/intelligence/RecommendationEngine';

const prisma = new PrismaClient();
async function run() {
    const tenant_id = '26e29999-5e6e-4022-bd85-17aec722655e';
    const lookbackDate = new Date(Date.now() - 7 * 86400000);
    const rawAnomalies = await prisma.anomalyEvent.findMany({
        where: { tenant_id, created_at: { gte: lookbackDate } },
        orderBy: { created_at: 'desc' }
    });
    console.log("Raw Anomalies:");
    rawAnomalies.forEach((a:any) => console.log(a.anomaly_type));
    console.log("==== Generating Actions ====");
    const actions = RecommendationEngine.generateActions(rawAnomalies);
    console.log("Found", actions.length, "actions");
    console.log(actions);
}
run();
