import { Request, Response } from 'express';
import { PrismaClient, AnomalyEvent } from '@prisma/client';
import { RecommendationEngine, StoreAction } from '../services/intelligence/RecommendationEngine';

const prisma = new PrismaClient();

const REGIONAL_LOOKBACK_DAYS = 7;

interface StoreRankingItem {
    store_id: number;
    store_name: string;
    risk_score: number;
    trend_direction: "UP" | "DOWN" | "FLAT";
    confidence_score: number;
    urgent_actions_count: number;
}

interface AnomalyDistributionItem {
    anomaly_type: string;
    count: number;
    percentage: number;
}

interface RegionalOverviewPayload {
    regional_summary: {
        total_stores: number;
        stores_at_risk: number;
        stores_low_trust: number;
        total_urgent_actions: number;
    };
    store_ranking: StoreRankingItem[];
    anomaly_distribution: AnomalyDistributionItem[];
    regional_trend: {
        direction: "UP" | "DOWN" | "FLAT";
        change_pct: number;
    };
}

export class RegionalController {

    public getRegionalOverview = async (req: any, res: Response) => {
        try {
            const tenant_id = req.user?.tenant_id;
            
            if (!tenant_id) {
                return res.status(401).json({ error: "Context Error: Tenant Missing" });
            }

            // Window Configuration
            const now = Date.now();
            const currentWindowStart = new Date(now - REGIONAL_LOOKBACK_DAYS * 86400000);
            const prevWindowStart = new Date(now - (REGIONAL_LOOKBACK_DAYS * 2) * 86400000);

            // Fetch Stores for Tenant
            const stores = await prisma.store.findMany({
                where: { company_id: tenant_id }
            });
            const total_stores = stores.length;

            if (total_stores === 0) {
                 return res.json({ success: true, data: this.emptyPayload() });
            }

            // Fetch Current Anomaly Data Window
            const currentAnomalies = await prisma.anomalyEvent.findMany({
                where: {
                    tenant_id,
                    created_at: { gte: currentWindowStart }
                }
            });

            // Fetch Previous Anomaly Data Window (for Trend)
            const prevAnomalies = await prisma.anomalyEvent.findMany({
                where: {
                    tenant_id,
                    created_at: { gte: prevWindowStart, lt: currentWindowStart }
                }
            });

            // BLOC 1/2: Isolate Valid vs Low Trust logic OUT of Risk Calculus
            const isTrustable = (a: AnomalyEvent) => a.confidence >= 65 && !a.anomaly_type.includes('LOW_TRUST') && !a.anomaly_type.includes('DATA_QUALITY');
            const pureCurrentAnomalies = currentAnomalies.filter(isTrustable);
            const purePrevAnomalies = prevAnomalies.filter(isTrustable);

            const currentActions = RecommendationEngine.generateActions(pureCurrentAnomalies);
            
            // Map Urgent Actions
            const urgentActionCounts = new Map<number, number>();
            currentActions.forEach(action => {
                if (action.priority === 'URGENT') {
                    urgentActionCounts.set(action.store_id, (urgentActionCounts.get(action.store_id) || 0) + 1);
                }
            });

            // BLOC 3: Deduplicate anomalies by store_id + anomaly_type + day
            const deduplicateByDay = (anomalies: AnomalyEvent[]) => {
                const map = new Map<string, AnomalyEvent>();
                anomalies.forEach(a => {
                    // Extract YYYY-MM-DD
                    const day = a.created_at.toISOString().split('T')[0];
                    const key = `${a.store_id}_${a.anomaly_type}_${day}`;
                    // Keep first encountered for the day (or could keep highest severity, keeping first is fine for count base)
                    if (!map.has(key)) map.set(key, a);
                });
                return Array.from(map.values());
            };

            // BLOC 2: Hardened Risk Scoring Engine per store ID
            const calcRisk = (anoms: AnomalyEvent[]) => {
                 const deduped = deduplicateByDay(anoms);
                 let critical = 0, high = 0, medium = 0, low = 0;
                 deduped.forEach(a => {
                     if (a.severity === 'CRITICAL') critical++;
                     else if (a.severity === 'HIGH') high++;
                     else if (a.severity === 'MEDIUM') medium++;
                     else low++;
                 });
                 const raw_score = (critical * 40) + (high * 20) + (medium * 8) + (low * 3);
                 return Math.min(100, raw_score);
            };

            const storeRankings: StoreRankingItem[] = [];
            let stores_at_risk = 0;
            let stores_low_trust = 0;
            let current_regional_risk_sum = 0;
            let prev_regional_risk_sum = 0;
            let trusted_stores_count = 0;

            for (const store of stores) {
                // System Trust Gate
                const lowTrustAnoms = currentAnomalies.filter(a => a.store_id === store.id && a.confidence < 65);
                const isStoreLowTrust = lowTrustAnoms.length > 0;
                
                if (isStoreLowTrust) {
                    stores_low_trust++;
                } else {
                    trusted_stores_count++;
                }

                // Current Risk
                const storeCurrentAnoms = pureCurrentAnomalies.filter(a => a.store_id === store.id);
                const currentRisk = calcRisk(storeCurrentAnoms);

                // Previous Risk
                const storePrevAnoms = purePrevAnomalies.filter(a => a.store_id === store.id);
                const prevRisk = calcRisk(storePrevAnoms);

                // Only trusted stores contribute to regional average risk
                if (!isStoreLowTrust) {
                    current_regional_risk_sum += currentRisk;
                    prev_regional_risk_sum += prevRisk;
                }

                if (currentRisk > 60) stores_at_risk++;

                // Local trend for ranking table display
                let storeTrend: "UP" | "DOWN" | "FLAT" = "FLAT";
                const localDelta = currentRisk - prevRisk;
                if (localDelta > 5) storeTrend = "UP";
                else if (localDelta < -5) storeTrend = "DOWN";

                // Average confidence for Store
                const confSum = currentAnomalies.filter(a => a.store_id === store.id).reduce((acc, sum) => acc + sum.confidence, 0);
                const totalStoreAnoms = currentAnomalies.filter(a => a.store_id === store.id).length;
                const avgConfidence = totalStoreAnoms > 0 ? (confSum / totalStoreAnoms) : 100;

                storeRankings.push({
                    store_id: store.id,
                    store_name: store.store_name,
                    risk_score: currentRisk,
                    trend_direction: storeTrend,
                    confidence_score: Math.round(avgConfidence),
                    urgent_actions_count: urgentActionCounts.get(store.id) || 0
                });
            }

            // BLOC 5: Strict Backend sort - Risk (DESC) -> Urgent (DESC) -> Confidence (ASC)
            storeRankings.sort((a, b) => {
                if (a.risk_score !== b.risk_score) return b.risk_score - a.risk_score;
                if (a.urgent_actions_count !== b.urgent_actions_count) return b.urgent_actions_count - a.urgent_actions_count;
                return a.confidence_score - b.confidence_score; // Lower trust ranks higher when ties exist
            });

            // BLOC 9: Anomaly Distribution (Valid only)
            const typeCounts: Record<string, number> = {};
            const dedupedPure = deduplicateByDay(pureCurrentAnomalies);
            dedupedPure.forEach(a => {
                const rootCauseMap = this.evaluateRootCause(a.anomaly_type);
                typeCounts[rootCauseMap] = (typeCounts[rootCauseMap] || 0) + 1;
            });
            const totalPureAnomalies = dedupedPure.length;
            const anomaly_distribution: AnomalyDistributionItem[] = Object.entries(typeCounts).map(([type, count]) => ({
                anomaly_type: type,
                count,
                percentage: totalPureAnomalies > 0 ? Math.round((count / totalPureAnomalies) * 100) : 0
            })).sort((a, b) => b.count - a.count);

            // BLOC 7 & 8: Regional Trend
            const avgClusterRisk = trusted_stores_count > 0 ? (current_regional_risk_sum / trusted_stores_count) : 0;
            const prevAvgClusterRisk = trusted_stores_count > 0 ? (prev_regional_risk_sum / trusted_stores_count) : 0;
            
            const delta = avgClusterRisk - prevAvgClusterRisk;
            let regTrend: "UP" | "DOWN" | "FLAT" = "FLAT";
            let change_pct = 0;

            if (trusted_stores_count >= 3) {
                if (delta > 5) regTrend = "UP";
                else if (delta < -5) regTrend = "DOWN";

                // Absolute clamp between -100 and +100 to prevent layout blowouts
                change_pct = Math.round(Math.max(-100, Math.min(100, delta)));
            }

            const total_urgent_actions = Array.from(urgentActionCounts.values()).reduce((a,b) => a+b, 0);

            // BLOC 10: Final DTO Construction
            const payload: RegionalOverviewPayload = {
                regional_summary: {
                    total_stores,
                    stores_at_risk,
                    stores_low_trust,
                    total_urgent_actions
                },
                store_ranking: storeRankings,
                anomaly_distribution,
                regional_trend: {
                    direction: regTrend,
                    change_pct
                }
            };

            return res.json({ success: true, data: payload });

        } catch (error: any) {
            console.error("Regional Oversight Engine Exception:", error);
            return res.status(500).json({ error: "Regional aggregation failed", details: error.message });
        }
    }

    private emptyPayload(): RegionalOverviewPayload {
        return {
             regional_summary: { total_stores: 0, stores_at_risk: 0, stores_low_trust: 0, total_urgent_actions: 0 },
             store_ranking: [],
             anomaly_distribution: [],
             regional_trend: { direction: 'FLAT', change_pct: 0 }
        };
    }

    private evaluateRootCause(anomaly_type: string): string {
        if (anomaly_type.includes('YIELD')) return "PORTION_CONTROL_FAILURE";
        if (anomaly_type.includes('SHRINK') || anomaly_type.includes('GHOST_SHIFT')) return "UNACCOUNTED_LOSS";
        if (anomaly_type.includes('INVOICE') || anomaly_type.includes('RECEIVING')) return "INVOICE_MISMATCH";
        if (anomaly_type.includes('CONFLICT') || anomaly_type === 'SIGNAL_CONFLICT_DETECTED') return "DATA_INCONSISTENCY";
        if (anomaly_type === 'SYSTEM_SUPPRESSION_LOW_TRUST') return "MISSING_OR_UNRELIABLE_DATA";
        return anomaly_type;
    }
}
