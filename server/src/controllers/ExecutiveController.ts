import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type PrimaryDriver =
  | "YIELD_VARIANCE"
  | "SHRINK_RISK"
  | "INVOICE_DISCREPANCY"
  | "SIGNAL_CONFLICT"
  | "LOW_DATA_TRUST"
  | "STABLE";

export interface StoreExecutiveSummary {
  store_id: number;
  store_name: string;
  risk_score: number;
  trend_direction: "UP" | "DOWN" | "FLAT";
  confidence_score: number;
  critical_flags: number;
  primary_driver: PrimaryDriver;
}

export class ExecutiveController {

    private requireCSuiteAccess(user: any) {
        if (!user || user.role === 'store_manager') {
             throw new Error("403: C-Level or Regional Access Required");
        }
    }

    public getExecutiveDashboard = async (req: any, res: any) => {
        try {
            this.requireCSuiteAccess(req.user);
            const tenant_id = req.user.tenant_id;

            // Puxar todos os Snapshots ativos (Últimos gerados)
            const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
            const snapshots = await prisma.intelligenceSnapshot.findMany({
                where: { tenant_id, period_end: { gte: thirtyDaysAgo } },
                orderBy: { period_end: 'desc' },
                include: { anomalies: true }
            });

            // Isolar o mais recente de cada loja e seu predecessor
            const storeState: Record<number, any> = {};
            const storePrevious: Record<number, any> = {};

            for (const snap of snapshots) {
                if (!snap.store_id) continue;
                if (!storeState[snap.store_id]) {
                     storeState[snap.store_id] = snap;
                } else if (!storePrevious[snap.store_id]) {
                     storePrevious[snap.store_id] = snap;
                }
            }

            const executiveSummaries: StoreExecutiveSummary[] = [];
            let globalTrustAggregate = 0;
            let activeCriticalOpsAnomalies = 0;
            let evaluatedStores = 0;

            for (const storeIdStr in storeState) {
                const storeId = parseInt(storeIdStr, 10);
                const current = storeState[storeId];
                const prev = storePrevious[storeId];
                
                evaluatedStores++;
                globalTrustAggregate += current.store_trust_score;

                // Definir tendência comparando risco atual com anterior
                let trend: "UP" | "DOWN" | "FLAT" = "FLAT";
                if (prev) {
                     if (current.op_risk_score > prev.op_risk_score + 2) trend = "UP"; // Piorou
                     else if (current.op_risk_score < prev.op_risk_score - 2) trend = "DOWN"; // Melhorou
                }

                // Filtrar anomalias puramente operacionais (Descartar ruído de dados pro C-Level)
                const opAnomalies = current.anomalies.filter((a: any) => a.anomaly_type !== 'SYSTEM_SUPPRESSION_LOW_TRUST');
                
                const criticalCount = opAnomalies.filter((a: any) => ['HIGH', 'CRITICAL'].includes(a.severity)).length;
                activeCriticalOpsAnomalies += criticalCount;

                // Determinar o driver de risco principal usando ENUM ESTRITO PRO C-LEVEL
                let primary_driver: PrimaryDriver = "STABLE"; // Considerado baseline
                if (opAnomalies.length > 0) {
                     const worstAnom = opAnomalies.sort((a: any, b: any) => {
                          const wA = a.severity === 'CRITICAL' ? 3 : a.severity === 'HIGH' ? 2 : 1;
                          const wB = b.severity === 'CRITICAL' ? 3 : b.severity === 'HIGH' ? 2 : 1;
                          return wB - wA;
                     })[0];
                     
                     if (worstAnom.anomaly_type.includes('YIELD')) primary_driver = "YIELD_VARIANCE";
                     else if (worstAnom.anomaly_type.includes('SHRINK') || worstAnom.anomaly_type.includes('LOSS')) primary_driver = "SHRINK_RISK";
                     else if (worstAnom.anomaly_type.includes('INVOICE') || worstAnom.anomaly_type.includes('RECEIVING')) primary_driver = "INVOICE_DISCREPANCY";
                     else if (worstAnom.anomaly_type.includes('CONFLICT') || worstAnom.anomaly_type === 'SIGNAL_CONFLICT_DETECTED') primary_driver = "SIGNAL_CONFLICT";
                     else if (worstAnom.anomaly_type === 'SYSTEM_SUPPRESSION_LOW_TRUST') primary_driver = "LOW_DATA_TRUST";
                     else primary_driver = "SIGNAL_CONFLICT"; // Fail-safe strictly clamped to Enum
                }

                // Garantir Confidence Score entre 0 e 100
                const normalizedConfidence = Math.max(0, Math.min(100, Math.round(current.confidence)));

                executiveSummaries.push({
                     store_id: storeId,
                     store_name: `Store #${storeId}`, // Placeholder until Store dict lookup
                     risk_score: current.op_risk_score,
                     trend_direction: trend,
                     confidence_score: normalizedConfidence,
                     critical_flags: criticalCount,
                     primary_driver
                });
            }

            // Exibir sempre os piores no topo
            executiveSummaries.sort((a, b) => b.risk_score - a.risk_score);

            res.json({
                 success: true,
                 data: {
                      top_risk_stores: executiveSummaries.slice(0, 5),
                      global_trust_score: evaluatedStores > 0 ? parseFloat((globalTrustAggregate / evaluatedStores).toFixed(1)) : 0,
                      active_critical_anomalies: activeCriticalOpsAnomalies
                 }
            });

        } catch (e: any) {
             res.status(e.message.includes('403') ? 403 : 500).json({ error: e.message });
        }
    }
}
