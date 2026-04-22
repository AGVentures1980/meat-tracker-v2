import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ExecutiveMetricsService } from '../services/ExecutiveMetricsService';
import { AuditService } from '../services/AuditService';

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

    private requireExecutiveAccess(user: any) {
        // Zero-Trust Role Hardening: Now allows GMs (store_manager) to view their own metrics but blocks operators
        const allowedRoles = ['admin', 'partner', 'director', 'corporate_director', 'c_level', 'regional_manager', 'store_manager'];
        if (!user || !allowedRoles.includes(user.role)) {
             throw new Error("403: ZERO-TRUST VIOLATION. Executive or GM Access Required.");
        }
        
        // Strict Operator Block
        if (user.role === 'operator' || user.role === 'floor_staff') {
            throw new Error("403: ZERO-TRUST VIOLATION. Operators cannot view executive metrics.");
        }
    }

    /**
     * V0 Legacy Executive Dashboard (DEPRECATED)
     * Maintained under observation per CFO requirement.
     */
    public getExecutiveDashboard = async (req: Request, res: Response) => {
        // Feature Flag Killswitch
        if (process.env.KILL_SWITCH_LEGACY_DASHBOARD === 'true') {
            return res.status(410).json({ error: 'This API has been decommissioned.' });
        }

        try {
            const user = (req as any).user;
            this.requireExecutiveAccess(user);
            const tenant_id = user.tenant_id;

            // Header explicit deprecation warning
            res.setHeader('X-API-Deprecated', 'true');
            res.setHeader('Warning', '299 - "Deprecated API: Use /overview/cache instead"');

            // Log Deprecated Call
            await AuditService.logAction(
                user.id,
                'DEPRECATED_API_ACCESS',
                'ExecutiveController_V0',
                { path: req.path, tenantId: tenant_id }
            );

            const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
            const snapshots = await prisma.intelligenceSnapshot.findMany({
                where: { tenant_id, period_end: { gte: thirtyDaysAgo } },
                orderBy: { period_end: 'desc' },
                include: { anomalies: true }
            });

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
                
                // GM Scoping Logic for Legacy: Only process their own store
                if (user.role === 'store_manager' && storeId !== user.storeId) {
                    continue; 
                }

                const current = storeState[storeId];
                const prev = storePrevious[storeId];
                
                evaluatedStores++;
                globalTrustAggregate += current.store_trust_score;

                let trend: "UP" | "DOWN" | "FLAT" = "FLAT";
                if (prev) {
                     if (current.op_risk_score > prev.op_risk_score + 2) trend = "UP"; 
                     else if (current.op_risk_score < prev.op_risk_score - 2) trend = "DOWN"; 
                }

                const opAnomalies = current.anomalies.filter((a: any) => a.anomaly_type !== 'SYSTEM_SUPPRESSION_LOW_TRUST');
                
                const criticalCount = opAnomalies.filter((a: any) => ['HIGH', 'CRITICAL'].includes(a.severity)).length;
                activeCriticalOpsAnomalies += criticalCount;

                let primary_driver: PrimaryDriver = "STABLE"; 
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
                     else primary_driver = "SIGNAL_CONFLICT"; 
                }

                const normalizedConfidence = Math.max(0, Math.min(100, Math.round(current.confidence)));

                executiveSummaries.push({
                     store_id: storeId,
                     store_name: `Store #${storeId}`, 
                     risk_score: current.op_risk_score,
                     trend_direction: trend,
                     confidence_score: normalizedConfidence,
                     critical_flags: criticalCount,
                     primary_driver
                });
            }

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

    /**
     * V1 Executive Overview - Optimized Snapshot Architecture
     * GET /overview/cache
     */
    public getExecutiveOverview = async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            this.requireExecutiveAccess(user);
            
            const companyId = user.tenant_id || user.companyId || (req.headers['x-company-id'] as string);
            
            if (!companyId) {
                return res.status(403).json({ error: 'Tenant Context Missing' });
            }

            // Scoping execution exactly as requested:
            let targetedStoreId: number | undefined = undefined;

            if (user.role === 'store_manager') {
                targetedStoreId = user.storeId; // GM is strictly locked to their single store.
            } else if (req.query.storeId) {
                targetedStoreId = parseInt(req.query.storeId as string);
                
                // If director / regional, ensure they can only query stores assigned to them.
                if (user.role === 'regional_manager' && targetedStoreId) {
                    const regionalCheck = await prisma.store.findFirst({
                        where: { id: targetedStoreId, area_manager_id: user.id }
                    });
                    if (!regionalCheck) {
                        return res.status(403).json({ error: 'Access Denied: Store not in your assigned region.' });
                    }
                }
            }

            // Audit Trail the Executive Access
            await AuditService.logAction(
                user.id,
                'EXECUTIVE_DASHBOARD_ACCESS',
                'ExecutiveMetrics',
                { companyId, targetedStoreId, timestamp: new Date(), roleScopingApplied: user.role }
            );

            // Fetch V1 Payload (Internally utilizes caching principles / Snapshots)
            const payload = await ExecutiveMetricsService.getLevel1Overview(companyId, targetedStoreId);
            
            // Set basic cache headers representing internal role-based isolation (Not shared CDN cache)
            res.setHeader('Cache-Control', 'private, max-age=30');

            res.json({
                 success: true,
                 data: payload
            });

        } catch (e: any) {
             console.error("Executive API Error", e);
             res.status(e.message.includes('403') ? 403 : 500).json({ error: e.message });
        }
    }

    /**
     * V1 Executive Action Telemetry (Pilot Tracing)
     * POST /api/v1/executive/action/:id/resolve
     */
    public executeActionDecision = async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            this.requireExecutiveAccess(user);
            
            const { id } = req.params;
            const { decisionStatus, resolutionOutcome, notes, viewedAt } = req.body;

            if (!['ACKNOWLEDGED', 'FORWARDED', 'APPROVED', 'RESOLVED', 'DISMISSED'].includes(decisionStatus)) {
                return res.status(400).json({ error: 'Invalid decision status.' });
            }

            const updatedDecision = await prisma.executiveActionDecision.update({
                where: { id },
                data: {
                    decisionStatus,
                    actedByUserId: user.id,
                    actedAt: new Date(),
                    resolvedAt: decisionStatus === 'RESOLVED' ? new Date() : undefined,
                    forwardedAt: decisionStatus === 'FORWARDED' ? new Date() : undefined,
                    viewedAt: viewedAt ? new Date(viewedAt) : undefined,
                    resolutionOutcome,
                    notes
                }
            });

            // Audit Telemetry Event
            await AuditService.logAction(
                user.id,
                `DECISION_${decisionStatus}`,
                'ExecutiveMetrics',
                { targetActionId: id, storeId: updatedDecision.storeId }
            );

            res.json({ success: true, data: updatedDecision });

        } catch (e: any) {
             res.status(e.message.includes('Record to update not found') ? 404 : 500).json({ error: e.message });
        }
    }
}

