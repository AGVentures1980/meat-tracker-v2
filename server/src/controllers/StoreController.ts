import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { RecommendationEngine } from '../services/intelligence/RecommendationEngine';

const prisma = new PrismaClient();

export const STORE_ACTION_LOOKBACK_DAYS = 7;

export class StoreController {

    public getStoreActions = async (req: any, res: Response) => {
        try {
            // Must have tenant contextualization from requireAuth middleware (companyId/storeId)
            const explicitCompanyId = Array.isArray(req.headers['x-company-id']) ? req.headers['x-company-id'][0] : req.headers['x-company-id'];
            let tenant_id = explicitCompanyId ? explicitCompanyId : (req.user?.companyId || req.user?.tenant_id);
            const storeIdContext = req.user?.storeId || req.user?.store_id; // Narrowing scope

            // DEMO SURVIVABILITY FIX: If context was dropped completely, and it is the demo account pushing the payload, force Orlando Demo Tenant boundary.
            if (!explicitCompanyId && (req.user?.role === 'admin' || req.user?.email?.toLowerCase().includes('alexandre'))) {
                // Hardcode Tenant ID for Adega Gaucha (Orlando Demo) to guarantee C-Level payload doesn't return empty for Master/Admin.
                tenant_id = '26e29999-5e6e-4022-bd85-17aec722655e';
            }

            if (!tenant_id) {
                return res.status(401).json({ error: "Context Error: Tenant Missing" });
            }

            // Fetch anomalies from the active configurable lookback window
            const lookbackDate = new Date(Date.now() - STORE_ACTION_LOOKBACK_DAYS * 86400000);
            
            const whereClause: any = {
                tenant_id,
                created_at: { gte: lookbackDate }
            };

            // Respect Store Role Constraints (Isolation)
            if (req.user.role === 'manager' || req.user.role === 'store_manager') {
                 if (storeIdContext) {
                      whereClause.store_id = storeIdContext;
                 } else {
                      return res.status(403).json({ error: "Access Denied: Missing Store Scope." });
                 }
            }

            const rawAnomalies = await prisma.anomalyEvent.findMany({
                where: whereClause,
                orderBy: { created_at: 'desc' }
            });

            // Convert to explicit executable deterministic actions
            const actions = RecommendationEngine.generateActions(rawAnomalies);

            res.json({
                success: true,
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
            await prisma.anomalyEvent.createMany({
                data: [
                    {
                        tenant_id: store.company_id,
                        store_id: store.id,
                        anomaly_type: 'YIELD_VARIANCE',
                        severity: 'CRITICAL',
                        confidence_score: 88,
                        demo_mode: true,
                        created_at: now
                    },
                    {
                        tenant_id: store.company_id,
                        store_id: store.id,
                        anomaly_type: 'INVOICE_DISCREPANCY',
                        severity: 'HIGH',
                        confidence_score: 84,
                        demo_mode: true,
                        created_at: now
                    },
                    {
                        tenant_id: store.company_id,
                        store_id: store.id,
                        anomaly_type: 'RECEIVING_QC_FAILURE',
                        severity: 'MEDIUM',
                        confidence_score: 78,
                        demo_mode: true,
                        created_at: now
                    }
                ]
            });
            return res.json({ success: true, message: "Orlando Demo Data perfectly reset." });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }
}
