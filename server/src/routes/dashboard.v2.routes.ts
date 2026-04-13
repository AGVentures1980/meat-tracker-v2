import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { MeatEngine } from '../engine/MeatEngine';
import { DashboardContractService, V1Payload, V1AnomalyData } from '../services/dashboardContractService';
import { PrismaClient, Role } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Helper to fetch V1 Anomaly equivalent logic (internal abstraction)
async function fetchBaseAnomalies(user: any): Promise<V1AnomalyData[]> {
    const stats = await MeatEngine.getExecutiveStats(user);
    const rules = stats.performance.filter((s: any) => {
        return ((Math.abs(s.lbsGuestVar) / s.target_lbs_guest) * 100) > 15;
    }).map((a: any) => ({
        storeId: a.id, name: a.name, variance: (a.lbsGuestVar / a.target_lbs_guest) * 100, type: 'VARIANCE'
    }));

    const twoDaysAgo = new Date();
    twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);
    const recentRejections = await prisma.barcodeScanEvent.findMany({
        where: { is_approved: false, scanned_at: { gte: twoDaysAgo } },
        include: { store: true },
        orderBy: { scanned_at: 'desc' },
        take: 10
    });

    const qcAlerts = recentRejections.map(r => ({
        storeId: r.store_id, name: (r as any).store?.store_name || `Store #${r.store_id}`, type: 'QC_ALERT'
    }));

    return [...qcAlerts, ...rules];
}

// ------------------------------------------------------------------
// V2 EXECUTIVE ENDPOINT
// ------------------------------------------------------------------
router.get('/executive-summary', requireAuth, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const activeCompanyId = (req.headers['x-company-id'] as string) || user.companyId;

        // Strict Execution Validation (FAIL-CLOSED)
        if (!activeCompanyId && user.role !== Role.admin) {
            return res.status(403).json({ error: 'Tenant Context (Company ID) missing.' });
        }
        
        const validExecutiveRoles = [Role.admin, Role.director, Role.vp];
        if (!validExecutiveRoles.includes(user.role)) {
            return res.status(403).json({ error: 'Role incompatible with Executive Summary payload.' });
        }

        // Functional Immutable User context for V1 Downstream compatibility
        const immutableUserCtx = { ...user, companyId: activeCompanyId };

        const [v1Stats, anomalies] = await Promise.all([
            MeatEngine.getExecutiveStats(immutableUserCtx),
            fetchBaseAnomalies(immutableUserCtx)
        ]);

        const contract = DashboardContractService.buildExecutiveSummary(v1Stats as V1Payload, anomalies);
        return res.json({ success: true, v2_contract: 'EXECUTIVE_SUMMARY', data: contract });

    } catch (error: any) {
        console.error('V2 Executive Summary Error:', error);
        return res.status(500).json({ error: 'Failed to process Executive Schema' });
    }
});

// ------------------------------------------------------------------
// V2 REGIONAL ENDPOINT
// ------------------------------------------------------------------
router.get('/regional-summary', requireAuth, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const activeCompanyId = (req.headers['x-company-id'] as string) || user.companyId;
        const regionId = req.query.regionId as string || user.regionId;

        // Security Scope Validation (FAIL-CLOSED)
        if (!activeCompanyId) {
            return res.status(403).json({ error: 'Tenant Context missing.' });
        }
        if (!regionId && user.role !== Role.admin) {
            return res.status(403).json({ error: 'Region Scope (regionId) missing for tactical view.' });
        }

        const immutableUserCtx = { ...user, companyId: activeCompanyId };

        const [v1Stats, anomalies] = await Promise.all([
            MeatEngine.getExecutiveStats(immutableUserCtx),
            fetchBaseAnomalies(immutableUserCtx)
        ]);

        const contract = DashboardContractService.buildRegionalSummary(v1Stats as V1Payload, anomalies, regionId);
        return res.json({ success: true, v2_contract: 'REGIONAL_SUMMARY', data: contract });

    } catch (error: any) {
        console.error('V2 Regional Summary Error:', error);
        return res.status(500).json({ error: 'Failed to process Regional Schema' });
    }
});

// ------------------------------------------------------------------
// V2 STORE ENDPOINT
// ------------------------------------------------------------------
router.get('/store-summary', requireAuth, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const activeCompanyId = (req.headers['x-company-id'] as string) || user.companyId;
        const storeId = req.query.storeId as string || (user.storeId ? user.storeId.toString() : null);

        // Security Scope Validation (FAIL-CLOSED)
        if (!activeCompanyId) {
            return res.status(403).json({ error: 'Tenant Context missing.' });
        }
        if (!storeId) {
            return res.status(403).json({ error: 'Store Scope (storeId) missing for operational view.' });
        }

        const allowedOverrideRoles = [Role.admin, Role.director, Role.vp, 'area_manager' as Role];
        if (!allowedOverrideRoles.includes(user.role) && user.storeId?.toString() !== storeId) {
            return res.status(403).json({ error: 'Access Denied: Attempting to fetch outer boundary Store context.' });
        }

        const immutableUserCtx = { ...user, companyId: activeCompanyId };

        const [v1Stats, anomalies] = await Promise.all([
            MeatEngine.getExecutiveStats(immutableUserCtx),
            fetchBaseAnomalies(immutableUserCtx)
        ]);

        const contract = DashboardContractService.buildStoreSummary(v1Stats as V1Payload, anomalies, storeId);
        return res.json({ success: true, v2_contract: 'STORE_SUMMARY', data: contract });

    } catch (error: any) {
        console.error('V2 Store Summary Error:', error);
        return res.status(500).json({ error: 'Failed to process Store Schema' });
    }
});

export default router;
