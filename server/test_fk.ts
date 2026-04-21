import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    try {
        await prisma.anomalyEvent.createMany({
            data: [{
                tenant_id: 'tenant1',
                anomaly_type: 'YIELD_VARIANCE',
                severity: 'CRITICAL',
                confidence: 88,
                trigger_value: 0.1,
                baseline_value: 0.05,
                message: 'test',
                snapshot_id: 'fake_snapshot_does_not_exist'
            }]
        });
        console.log("Success?");
    } catch(e:any) {
        console.log("Error:", e.message);
    }
}
run();
