import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    const store = await prisma.store.findFirst({ where: { store_name: { contains: 'Orlando' } } });
    if (!store) {
        console.error("Orlando store missing.");
        process.exit(1);
    }

    const DEMO_STORE_ID = store.id;
    const DEMO_COMPANY_ID = store.company_id;
    
    // Clear old demo events
    await prisma.anomalyEvent.deleteMany({
        where: { store_id: DEMO_STORE_ID, demo_mode: true }
    });

    const now = new Date();
    const snapshot_id = "demo_mode_snapshot_forced_override";

    // Enforce Foreign Key Safety
    const existingSnapshot = await prisma.intelligenceSnapshot.findUnique({ where: { id: snapshot_id } });
    if (!existingSnapshot) {
        await prisma.intelligenceSnapshot.create({
            data: {
                id: snapshot_id,
                tenant_id: DEMO_COMPANY_ID,
                store_id: DEMO_STORE_ID,
                period_start: now,
                period_end: now,
                ruleset_version: "DEMO_OVERRIDE"
            }
        });
    }

    // FASE 4: INSERÇÃO MANUAL DE DADOS NA FONTE CORRETA
    const result = await prisma.anomalyEvent.createMany({
        data: [
            {
                tenant_id: DEMO_COMPANY_ID,
                store_id: DEMO_STORE_ID,
                anomaly_type: 'YIELD_VARIANCE',
                severity: 'CRITICAL',
                confidence: 95,
                demo_mode: true, // Bypass Lookback = true
                created_at: now,
                snapshot_id,
                message: 'YIELD_VARIANCE: lbs_guest_delta_pct +9.2% detected. Root cause structurally coherent with missing portions.',
                trigger_value: 0.092,
                baseline_value: 0.02
            },
            {
                tenant_id: DEMO_COMPANY_ID,
                store_id: DEMO_STORE_ID,
                anomaly_type: 'INVOICE_DISCREPANCY',
                severity: 'HIGH',
                confidence: 88,
                demo_mode: true,
                created_at: now,
                snapshot_id,
                message: 'INVOICE_DISCREPANCY: invoice_variance_pct -6.5%. Weight divergence verified against local vendor manifest.',
                trigger_value: -0.065,
                baseline_value: 0.0
            },
            {
                tenant_id: DEMO_COMPANY_ID,
                store_id: DEMO_STORE_ID,
                anomaly_type: 'RECEIVING_QC_FAILURE',
                severity: 'MEDIUM',
                confidence: 82,
                demo_mode: true,
                created_at: now,
                snapshot_id,
                message: 'Recebimento fora do padrão de temperatura identificado.',
                trigger_value: 46.5,
                baseline_value: 40.0
            }
        ]
    });
    
    console.log(`Inserted ${result.count} explicit demo anomaly records for Orlando.`);
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
