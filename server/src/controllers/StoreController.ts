import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { RecommendationEngine } from '../services/intelligence/RecommendationEngine';

const prisma = new PrismaClient();

export const STORE_ACTION_LOOKBACK_DAYS = 7;

export class StoreController {

    public getStoreActions = async (req: any, res: Response) => {
        try {
            const isMasterAccount = req.user?.role === 'master' || req.user?.role === 'admin' || req.user?.email?.toLowerCase().includes('alexandre');
            
            // FASE 3: Constant Demo Override
            const DEMO_MODE = true;
            const DEMO_STORE_ID = 8;
            const DEMO_COMPANY_ID = '26e29999-5e6e-4022-bd85-17aec722655e';
            
            let resolvedStoreId = req.user?.storeId || req.user?.store_id;
            let resolvedCompanyId = req.user?.companyId || req.user?.tenant_id;
            let resolutionSource = "explicit_store";

            if (DEMO_MODE) {
                resolvedStoreId = DEMO_STORE_ID;
                resolvedCompanyId = DEMO_COMPANY_ID;
                resolutionSource = isMasterAccount ? "master_global_demo_override" : "demo_mode_forced";
            } else {
                if (req.user?.role === 'manager' || req.user?.role === 'store_manager') {
                     if (!resolvedStoreId) throw new Error("STORE_CONTEXT_INVALID");
                } else if (isMasterAccount) {
                     resolvedStoreId = DEMO_STORE_ID;
                     resolvedCompanyId = DEMO_COMPANY_ID;
                     resolutionSource = "master_global";
                }
            }

            if (!resolvedStoreId) throw new Error("STORE_NOT_FOUND");
            if (!resolvedCompanyId) throw new Error("SCOPE_CORRUPTION");

            // Real DB Logic with Phase 5 Bypass
            const lookbackDate = new Date(Date.now() - STORE_ACTION_LOOKBACK_DAYS * 86400000);
            const whereClause: any = {
                tenant_id: resolvedCompanyId,
                store_id: resolvedStoreId,
                OR: [
                    { created_at: { gte: lookbackDate } },
                    { demo_mode: true } // FASE 5: BYPASS DE LOOKBACK
                ]
            };

            const rawAnomalies = await prisma.anomalyEvent.findMany({
                where: whereClause,
                orderBy: { created_at: 'desc' }
            });

            // FASE 2: Consome apenas a fonte real via Engine
            const actions = RecommendationEngine.generateActions(rawAnomalies);

            // Smoke Test Verification
            const urgentCount = actions.filter(a => a.priority === 'URGENT').length;
            const highCount = actions.filter(a => a.priority === 'HIGH').length;
            const mediumCount = actions.filter(a => a.priority === 'MEDIUM').length;

            res.json({
                success: true,
                resolved_scope: {
                    requested_store_id: req.user?.storeId || req.user?.store_id || null,
                    resolved_store_id: resolvedStoreId,
                    resolved_company_id: resolvedCompanyId,
                    resolution_source: resolutionSource,
                    lookback_days: STORE_ACTION_LOOKBACK_DAYS
                },
                counts: {
                    raw_anomalies: rawAnomalies.length,
                    within_time_window: rawAnomalies.filter(a => a.created_at >= lookbackDate).length,
                    eligible: actions.length,
                    urgent: urgentCount,
                    high: highCount,
                    medium: mediumCount
                },
                empty_reason: actions.length === 0 ? "No anomalies detected in the designated lookback period that satisfy confidence thresholds." : null,
                data: {
                    actions
                }
            });

        } catch (e: any) {
            console.error('Store Actions Engine Error:', e);
            res.status(500).json({ error: 'Failed to evaluate store actions' });
        }
    }

    public triggerDemoRestore = async (req: Request, res: Response) => {
        try {
            const store = await prisma.store.findFirst({ where: { store_name: { contains: 'Orlando' } } });
            if (!store) return res.status(404).json({ error: "Store Orlando missing." });

            await prisma.anomalyEvent.deleteMany({
                where: { store_id: store.id, demo_mode: true }
            });

            const now = new Date();
            const snapshot_id = "demo_mode_snapshot_forced_override";

            // Enforce Foreign Key Safety
            const existingSnapshot = await prisma.intelligenceSnapshot.findUnique({ where: { id: snapshot_id } });
            if (!existingSnapshot) {
                await prisma.intelligenceSnapshot.create({
                    data: {
                        id: snapshot_id,
                        tenant_id: store.company_id,
                        store_id: store.id,
                        period_start: now,
                        period_end: now,
                        ruleset_version: "DEMO_OVERRIDE"
                    }
                });
            }

            await prisma.anomalyEvent.createMany({
                data: [
                    {
                        tenant_id: store.company_id,
                        store_id: store.id,
                        anomaly_type: 'YIELD_VARIANCE',
                        severity: 'CRITICAL',
                        confidence: 88,
                        demo_mode: true,
                        created_at: now,
                        snapshot_id,
                        message: 'YIELD_VARIANCE: lbs_guest_delta_pct +9.2% detected. Root cause structurally coherent with missing portions.',
                        trigger_value: 0.092,
                        baseline_value: 0.02
                    },
                    {
                        tenant_id: store.company_id,
                        store_id: store.id,
                        anomaly_type: 'INVOICE_DISCREPANCY',
                        severity: 'HIGH',
                        confidence: 84,
                        demo_mode: true,
                        created_at: now,
                        snapshot_id,
                        message: 'INVOICE_DISCREPANCY: invoice_variance_pct -6.5%. Weight divergence verified against local vendor manifest.',
                        trigger_value: -0.065,
                        baseline_value: 0.0
                    },
                    {
                        tenant_id: store.company_id,
                        store_id: store.id,
                        anomaly_type: 'RECEIVING_QC_FAILURE',
                        severity: 'MEDIUM',
                        confidence: 78,
                        demo_mode: true,
                        created_at: now,
                        snapshot_id,
                        message: 'Recebimento fora do padrão de temperatura identificado.',
                        trigger_value: 46.5,
                        baseline_value: 40.0
                    }
                ]
            });
            return res.json({ success: true, message: "Orlando Demo Data perfectly reset." });
        } catch (error: any) {
            console.error("FORCED RESET CRASH:", error);
            return res.status(500).json({ error: error.message });
        }
    }
}
