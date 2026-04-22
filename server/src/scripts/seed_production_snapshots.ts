import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Enterprise Phase 5 Snapshot Seeding...");

    const companyId = '3a6ac28e-6b5e-4a60-8ad6-5bc18a4b5037';
    const storeIds = [1202, 1203, 1204, 1205];
    const daysToMock = 7;
    let recordsCreated = 0;

    for (const storeId of storeIds) {
        console.log(`\nSeeding store: ${storeId}`);
        for (let i = 0; i < daysToMock; i++) {
            const date = new Date(new Date().setDate(new Date().getDate() - i));
            date.setHours(0, 0, 0, 0);

            const periodEnd = new Date(date);
            periodEnd.setHours(23, 59, 59, 999);

            const ruleset_version = 'v4.2.0';
            const op_risk_score = Math.floor(Math.random() * (95 - 82 + 1) + 82);
            const store_trust_score = Math.floor(Math.random() * (98 - 88 + 1) + 88);
            const ingestion_score = Math.floor(Math.random() * (95 - 85 + 1) + 85);
            
            const lbs_guest_real = Number((Math.random() * (0.78 - 0.65) + 0.65).toFixed(4));
            const lbs_guest_theo = 0.75;
            const lbs_guest_delta_pct = Number(((lbs_guest_real - lbs_guest_theo) / lbs_guest_theo * 100).toFixed(2));
            const source_inputs_used = Math.floor(Math.random() * (14 - 8 + 1) + 8);

            const snapshotId = `pilot-snap-${storeId}-${date.toISOString().split('T')[0]}`;
            
            await prisma.intelligenceSnapshot.upsert({
                where: { 
                    tenant_id_store_id_period_start_period_end: {
                        tenant_id: companyId,
                        store_id: storeId,
                        period_start: date,
                        period_end: periodEnd
                    }
                },
                update: {},
                create: {
                    id: snapshotId,
                    tenant_id: companyId,
                    store_id: storeId,
                    period_start: date,
                    period_end: periodEnd,
                    op_risk_score,
                    store_trust_score,
                    ingestion_score,
                    lbs_guest_real,
                    lbs_guest_theo,
                    lbs_guest_delta_pct,
                    source_inputs_used,
                    ruleset_version
                }
            });
            recordsCreated++;
        }
    }

    console.log(`\nSeed completed! Created ${recordsCreated} IntelligenceSnapshot records.`);
}

main()
    .catch((e) => {
        console.error("FATAL ERROR IN SEED:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
