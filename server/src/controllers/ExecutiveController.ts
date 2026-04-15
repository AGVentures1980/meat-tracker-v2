import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ExecutiveMetricsService } from '../services/ExecutiveMetricsService';
import { AuditService } from '../services/AuditService';

const prisma = new PrismaClient();

export class ExecutiveController {

    private requireCSuiteAccess(user: any) {
        // Zero-Trust Role Hardening
        const allowedRoles = ['admin', 'partner', 'director'];
        if (!user || (!allowedRoles.includes(user.role) && user.role !== 'c_level')) {
             throw new Error("403: ZERO-TRUST VIOLATION. C-Level or Regional Access Required.");
        }
    }

    /**
     * V1 Executive Overview - Replaces Legacy IntelligenceSnapshot with True Dashboard JSON Fast-Load
     * GET /overview/cache
     */
    public getExecutiveOverview = async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            this.requireCSuiteAccess(user);
            
            const companyId = user.tenant_id || user.companyId || (req.headers['x-company-id'] as string);
            
            if (!companyId) {
                return res.status(403).json({ error: 'Tenant Context Missing' });
            }

            // Optional drill-down
            const storeId = req.query.storeId ? parseInt(req.query.storeId as string) : undefined;

            // Audit Trail the Executive Access
            await AuditService.logAction(
                user.id,
                'EXECUTIVE_DASHBOARD_ACCESS',
                'ExecutiveMetrics',
                { companyId, storeId }
            );

            // Pull direct from Service (which later can be augmented to strictly read ExecutiveSnapshotLedger)
            const payload = await ExecutiveMetricsService.getLevel1Overview(companyId, storeId);
            
            res.json({
                 success: true,
                 data: payload
            });

        } catch (e: any) {
             console.error("Executive API Error", e);
             res.status(e.message.includes('403') ? 403 : 500).json({ error: e.message });
        }
    }
}
