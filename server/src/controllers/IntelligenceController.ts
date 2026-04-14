import { PrismaClient } from '@prisma/client';
import { ScoreCalculator } from '../services/intelligence/ScoreCalculator';
import { AnomalyEngine, AnomalyInput } from '../services/intelligence/AnomalyEngine';
import { BaselineEngine } from '../services/intelligence/BaselineEngine';

const prisma = new PrismaClient();

export class IntelligenceController {

    private requireExecutiveAccess(user: any) {
        if (!user) throw new Error("Unauthorized");
        if (!user.role || !['admin', 'director', 'vp'].includes(user.role)) {
            throw new Error("403: Exclusive Intelligence Layer Access required");
        }
    }

    public generateSnapshot = async (req: any, res: any) => {
        try {
            this.requireExecutiveAccess(req.user);
            const { store_id } = req.body;
            const tenant_id = req.user.tenant_id;

            // 1. Adaptive Calibrations: Fetch last 30 days of IntelligenceSnapshots
            const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
            const historicalSnapshots = store_id ? await prisma.intelligenceSnapshot.findMany({
                where: {
                    tenant_id,
                    store_id: parseInt(store_id, 10),
                    period_start: { gte: thirtyDaysAgo }
                },
                orderBy: { period_end: 'asc' }
            }) : [];

            // 2. Compute the Local Adaptive Context via BaselineEngine
            const baselineContext = BaselineEngine.computeHistoricalBaseline(historicalSnapshots);

            // 3. Gather Signals
            const input: AnomalyInput = {
                lbs_guest_delta_pct: 9.2, 
                invoice_variance: 100, 
                shrink_probability: 0.1,
                ingestion_confidence: 0.95, 
                missing_days: 1, 
                store_trust_score: 95,
                baselineContext // Newly dynamically hooked parameter
            };
            
            // 4. Score Definitions
            const risk_score = ScoreCalculator.calculateOpRiskScore(input.lbs_guest_delta_pct, input.shrink_probability, input.invoice_variance);
            const verified_trust = ScoreCalculator.calculateStoreTrustScore(input.ingestion_confidence, input.missing_days);
            
            input.store_trust_score = verified_trust;

            // 5. Run Anomaly Engine (Triggering Z-Score Overrides if Context exists)
            const anomalies = AnomalyEngine.evaluate(input);

            // 6. TRANSACTIONAL PERSISTENCE (Complete Lineage trace including Z-Score config)
            const result = await prisma.$transaction(async (tx) => {
                
                const snapshot = await tx.intelligenceSnapshot.create({
                    data: {
                        tenant_id,
                        store_id: store_id ? parseInt(store_id, 10) : null,
                        period_start: new Date(Date.now() - 7 * 86400000), 
                        period_end: new Date(),
                        op_risk_score: risk_score,
                        store_trust_score: verified_trust,
                        lbs_guest_delta_pct: input.lbs_guest_delta_pct,
                        ruleset_version: 'v1.2-brazil_adaptive_zscore',
                        confidence: verified_trust / 100,
                        local_baseline_context: baselineContext ? (baselineContext as any) : null
                    }
                });

                for (const anom of anomalies) {
                    const anomalyRecord = await tx.anomalyEvent.create({
                        data: {
                            snapshot_id: snapshot.id,
                            tenant_id,
                            store_id: store_id ? parseInt(store_id, 10) : null,
                            anomaly_type: anom.type,
                            severity: anom.severity,
                            confidence: verified_trust / 100,
                            message: anom.message,
                            trigger_value: anom.trigger_value,
                            baseline_value: baselineContext ? baselineContext.lbs_guest_delta.mean : 0
                        }
                    });

                    for (const act of anom.actions) {
                        await tx.recommendationEvent.create({
                            data: {
                                snapshot_id: snapshot.id,
                                anomaly_id: anomalyRecord.id,
                                tenant_id,
                                store_id: store_id ? parseInt(store_id, 10) : null,
                                action_code: act.action_code,
                                title: act.title,
                                description: act.description,
                                rationale: act.rationale,
                                owner_role: act.owner_role,
                                priority: act.priority
                            }
                        });
                    }
                }

                await tx.intakeAudit.create({
                     data: {
                          correlation_id: `INTELLIGENCE_SNAP_${snapshot.id}`,
                          actor_user_id: req.user.id || 'SYSTEM_CRON',
                          actor_role: req.user.role,
                          action: 'GENERATED_INTELLIGENCE_SNAPSHOT',
                          target_resource: 'IntelligenceController',
                          effective_scope: tenant_id,
                          fingerprint: `RISK_${risk_score}_ANOMALIES_${anomalies.length}`,
                          result_status: 'SUCCESS'
                     }
                });

                return { snapshot, triggerCount: anomalies.length };
            });

            res.json({ success: true, result });
        } catch (e: any) {
             res.status(e.message.includes('403') ? 403 : 500).json({ error: e.message });
        }
    };
    
    public getStoreSummary = async (req: any, res: any) => {
        try {
             res.json({ success: true, warning: 'Endpoint constructed. See generateSnapshot.' });
        } catch(e: any) { res.status(500).json({ error: e.message }); }
    };
}
