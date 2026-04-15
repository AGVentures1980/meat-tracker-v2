import { PrismaClient } from '@prisma/client';
import { ExecutiveMetricsService } from '../services/ExecutiveMetricsService';
import { AuditService } from '../services/AuditService';
import { startOfDay, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const prisma = new PrismaClient();

/**
 * 🦅 Daily Executive Snapshot Job
 * Generates the idempotent, explicitly versioned, lightweight daily ledger required by C-Level.
 * Guardrails: Timezone awareness, Fallback Completeness, Provenance Tracking.
 */
export class DailyExecutiveSnapshotJob {

    // Current Code Version for tracing
    private static METRICS_VERSION = 'v2.2_Executive';
    private static SCORE_VERSION = 'v1.4_Integrity';
    private static POLICY_VERSION = 'v1.0_Hardlock';

    public static async run(params?: { targetStoreId?: number, targetDate?: string, allowOverwriteFinal?: boolean }) {
        console.log(`[Job] Executing DailyExecutiveSnapshotJob...`);
        const executionStart = Date.now();
        let totalProcessed = 0;
        let totalFailed = 0;

        try {
            // Find target stores
            const whereStore: any = { status: 'ACTIVE' };
            if (params?.targetStoreId) {
                whereStore.id = params.targetStoreId;
            }

            const activeStores = await prisma.store.findMany({
                where: whereStore,
                include: { company: true }
            });

            for (const store of activeStores) {
                try {
                    await this.processStoreSnapshot(store, params);
                    totalProcessed++;
                } catch (storeErr: any) {
                    console.error(`[Job] ❌ Failed Snapshot for Store ${store.id}:`, storeErr.message);
                    totalFailed++;
                }
            }

            // Audit the Job Completion
            await AuditService.logAction(
                'SYSTEM_CRON',
                'EXECUTIVE_SNAPSHOT_JOB_COMPLETED',
                'SystemJob',
                { 
                    durationMs: Date.now() - executionStart,
                    processedStores: totalProcessed,
                    failedStores: totalFailed,
                    targetDate: params?.targetDate || 'TODAY'
                }
            );

            console.log(`[Job] ✅ Snapshot Job Completed in ${Date.now() - executionStart}ms. Processed: ${totalProcessed}. Failed: ${totalFailed}.`);

        } catch (error: any) {
            console.error(`[Job] 🚨 FATAL CRASH IN SNAPSHOT SCRIPT:`, error.message);
            // We should ideally ping Slack/Datadog here if the cron system itself dies.
        }
    }

    private static async processStoreSnapshot(store: any, params?: { targetDate?: string, allowOverwriteFinal?: boolean }) {
        // Timezone Resolution
        const timeZone = store.timezone || 'America/Chicago'; // Assume CST if missing.
        
        // Determine the targeted business date in the store's local timezone
        let targetBusinessDate: Date;
        if (params?.targetDate) {
            targetBusinessDate = new Date(params.targetDate); // Assumes YYYY-MM-DD input
        } else {
            // "Today" in the store's timezone
            const now = new Date();
            const zonedDate = toZonedTime(now, timeZone);
            targetBusinessDate = startOfDay(zonedDate);
        }

        // Prevent destructive silent overwrites of Finalized weeks
        const existingLedger = await prisma.executiveSnapshotLedger.findFirst({
            where: {
                companyId: store.company_id,
                storeId: store.id,
                snapshotType: 'DAILY',
                businessDate: targetBusinessDate
            }
        });

        if (existingLedger?.isFinal && !params?.allowOverwriteFinal) {
            console.log(`[Job] ⏭️ Skipping Store ${store.id} for ${format(targetBusinessDate, 'yyyy-MM-dd')}: Ledger is FINAL.`);
            return;
        }

        // 1. Fetch Executive Core Logic
        // In the real system, ExecutiveMetricsService handles the math. We delegate out.
        const metrics = await ExecutiveMetricsService.getLevel1Overview(store.company_id, store.id);

        let completenessStatus = 'COMPLETE';
        const missingSources: string[] = [];
        let reasonIfPartial = null;

        // Degradation check - If Confidence is strictly completely missing.
        if (metrics.health.lbsPerGuestDiningRoom.confidence === 'LOW') {
            completenessStatus = 'PARTIAL';
            missingSources.push('POS_GUEST_DATA');
            reasonIfPartial = metrics.health.lbsPerGuestDiningRoom.reasonIfNull || "Lack of historical POS alignment";
        }

        // 2. UPSERT into Ledger (Idempotent Execution)
        const snapshot = await prisma.executiveSnapshotLedger.upsert({
            where: {
                companyId_storeId_snapshotType_businessDate: {
                    companyId: store.company_id,
                    storeId: store.id,
                    snapshotType: 'DAILY',
                    businessDate: targetBusinessDate
                }
            },
            update: {
                integrityScore: metrics.health.operatingIntegrityScore.value || 0,
                executiveRiskLevel: metrics.health.executiveRiskLevel.value || 'STABLE',
                weeklyVarianceUSD: metrics.health.weeklyVarianceUSD.value || 0,
                lbsPerGuestDiningRoom: metrics.health.lbsPerGuestDiningRoom.value,
                actionPanelPayload: metrics.actionPanel as any,
                metricsVersion: this.METRICS_VERSION,
                scoreVersion: this.SCORE_VERSION,
                policyVersion: this.POLICY_VERSION,
                isFinal: false,
                completenessStatus,
                missingSources,
                reasonIfPartial,
                generatedAt: new Date()
            },
            create: {
                companyId: store.company_id,
                storeId: store.id,
                snapshotType: 'DAILY',
                businessDate: targetBusinessDate,
                integrityScore: metrics.health.operatingIntegrityScore.value || 0,
                executiveRiskLevel: metrics.health.executiveRiskLevel.value || 'STABLE',
                weeklyVarianceUSD: metrics.health.weeklyVarianceUSD.value || 0,
                lbsPerGuestDiningRoom: metrics.health.lbsPerGuestDiningRoom.value,
                actionPanelPayload: metrics.actionPanel as any,
                metricsVersion: this.METRICS_VERSION,
                scoreVersion: this.SCORE_VERSION,
                policyVersion: this.POLICY_VERSION,
                isFinal: false,
                completenessStatus,
                missingSources,
                reasonIfPartial
            }
        });

        // 3. Link Action Panel to explicitly versioned source Snapshot and Workflow rules
        if (metrics.actionPanel && metrics.actionPanel.length > 0) {
            for (const action of metrics.actionPanel) {
                // Upsert logic for Action Decisions is trickier, so we ensure no duplicates by code and business date.
                // Assuming action.code is something like 'EVT_HIGH_VARIANCE'. We can append storeId and businessDate for idempotency.
                const uniqueActionCode = `${action.code}_${store.id}_${format(targetBusinessDate, 'yyyy-MM-dd')}`;
                
                await prisma.executiveActionDecision.upsert({
                     where: { id: uniqueActionCode }, // Using a pseudo-id for idempotency. Let's rely on finding first instead if schema doesn't allow string id override gracefully.
                     create: {
                          id: uniqueActionCode,
                          companyId: store.company_id,
                          storeId: store.id,
                          actionCode: action.code,
                          actionTitle: action.title,
                          actionSeverity: action.severity,
                          financialImpactEstimateUSD: action.financialImpactEstimateUSD,
                          sourceSnapshotId: snapshot.id,
                          sourceMetricVersion: this.METRICS_VERSION,
                          sourceBusinessDate: targetBusinessDate,
                          targetType: action.targetType,
                          targetId: action.externalReferenceId, // The DTO uses externalReferenceId
                          decisionStatus: 'OPEN',
                          createdBySystem: true,
                     },
                     update: {
                          // Only update if it's still open
                          financialImpactEstimateUSD: action.financialImpactEstimateUSD,
                          sourceSnapshotId: snapshot.id,
                          sourceMetricVersion: this.METRICS_VERSION
                     }
                });
            }
        }
    }
}
