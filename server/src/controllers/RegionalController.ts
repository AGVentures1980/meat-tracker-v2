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

            // Isolate Low Trust vs Actionable Logic out of the gate
            const pureCurrentAnomalies = currentAnomalies.filter(a => a.confidence >= 65 && a.anomaly_type !== 'SYSTEM_SUPPRESSION_LOW_TRUST');
            const purePrevAnomalies = prevAnomalies.filter(a => a.confidence >= 65 && a.anomaly_type !== 'SYSTEM_SUPPRESSION_LOW_TRUST');

            const currentActions = RecommendationEngine.generateActions(pureCurrentAnomalies);
            
            // Build Maps
            const urgentActionCounts = new Map<number, number>();
            currentActions.forEach(action => {
                if (action.priority === 'URGENT') {
                    urgentActionCounts.set(action.store_id, (urgentActionCounts.get(action.store_id) || 0) + 1);
                }
            });

            // Risk Scoring Engine per store ID
            const calcRisk = (anoms: AnomalyEvent[]) => {
                 let score = 0;
                 anoms.forEach(a => {
                     if (a.severity === 'CRITICAL') score += 100;
                     else if (a.severity === 'HIGH') score += 50;
                     else if (a.severity === 'MEDIUM') score += 25;
                     else score += 10;
                 });
                 // Clamp max score to 100 artificially if we want visual % display later, or leave as points.
                 // We leave as bounded index to 100% logic:
                 return Math.min(100, Math.floor(score / (anoms.length || 1))); // simplistic average density 
            };

            const storeRankings: StoreRankingItem[] = [];
            let stores_at_risk = 0;
            let stores_low_trust = 0;
            let regional_risk_sum = 0;
            let prev_regional_risk_sum = 0;

            const storeNames = new Map(stores.map(s => [s.id, s.store_name]));

            for (const store of stores) {
                // Current Risk
                const storeCurrentAnoms = pureCurrentAnomalies.filter(a => a.store_id === store.id);
                // System Trust
                const lowTrustAnoms = currentAnomalies.filter(a => a.store_id === store.id && a.confidence < 65);
                if (lowTrustAnoms.length > 0) stores_low_trust++;

                // Previous Risk
                const storePrevAnoms = purePrevAnomalies.filter(a => a.store_id === store.id);

                const currentRisk = calcRisk(storeCurrentAnoms);
                const prevRisk = calcRisk(storePrevAnoms);
                regional_risk_sum += currentRisk;
                prev_regional_risk_sum += prevRisk;

                if (currentRisk > 30) stores_at_risk++; // Threshold heuristic

                let trend: "UP" | "DOWN" | "FLAT" = "FLAT";
                if (currentRisk > prevRisk) trend = "UP";
                else if (currentRisk < prevRisk) trend = "DOWN";

                // Average confidence for Store
                const confSum = storeCurrentAnoms.reduce((acc, sum) => acc + sum.confidence, 0);
                const avgConfidence = storeCurrentAnoms.length > 0 ? (confSum / storeCurrentAnoms.length) : 100;

                storeRankings.push({
                    store_id: store.id,
                    store_name: store.store_name,
                    risk_score: currentRisk,
                    trend_direction: trend,
                    confidence_score: Math.round(avgConfidence),
                    urgent_actions_count: urgentActionCounts.get(store.id) || 0
                });
            }

            // BLOC 1: Strict Backend sort - Risk (DESC) -> Urgent (DESC) -> Confidence (ASC)
            storeRankings.sort((a, b) => {
                if (a.risk_score !== b.risk_score) return b.risk_score - a.risk_score;
                if (a.urgent_actions_count !== b.urgent_actions_count) return b.urgent_actions_count - a.urgent_actions_count;
                return a.confidence_score - b.confidence_score;
            });

            // BLOC 3: Anomaly Distribution (Valid only)
            const typeCounts: Record<string, number> = {};
            pureCurrentAnomalies.forEach(a => {
                const rootCauseMap = this.evaluateRootCause(a.anomaly_type);
                typeCounts[rootCauseMap] = (typeCounts[rootCauseMap] || 0) + 1;
            });
            const totalPureAnomalies = pureCurrentAnomalies.length;
            const anomaly_distribution: AnomalyDistributionItem[] = Object.entries(typeCounts).map(([type, count]) => ({
                anomaly_type: type,
                count,
                percentage: totalPureAnomalies > 0 ? Math.round((count / totalPureAnomalies) * 100) : 0
            })).sort((a, b) => b.count - a.count); // sort distribution heavily as well

            // BLOC 4: Regional Trend
            const avgClusterRisk = regional_risk_sum / total_stores;
            const prevAvgClusterRisk = prev_regional_risk_sum / total_stores;
            
            let regTrend: "UP" | "DOWN" | "FLAT" = "FLAT";
            let change_pct = 0;

            // Protection: minimum of 3 stores required to declare a systemic trend
            if (total_stores >= 3) {
                if (avgClusterRisk > prevAvgClusterRisk) regTrend = "UP";
                else if (avgClusterRisk < prevAvgClusterRisk) regTrend = "DOWN";

                if (prevAvgClusterRisk > 0) {
                     change_pct = Math.round(Math.abs((avgClusterRisk - prevAvgClusterRisk) / prevAvgClusterRisk) * 100);
                }
            }

            const total_urgent_actions = Array.from(urgentActionCounts.values()).reduce((a,b) => a+b, 0);

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
