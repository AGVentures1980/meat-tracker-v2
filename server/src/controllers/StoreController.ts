import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { RecommendationEngine } from '../services/intelligence/RecommendationEngine';

const prisma = new PrismaClient();

export const STORE_ACTION_LOOKBACK_DAYS = 7;

export class StoreController {

    public getStoreActions = async (req: any, res: Response) => {
        try {
            // Must have tenant contextualization from requireAuth middleware (companyId/storeId)
            const tenant_id = req.user?.companyId || req.user?.tenant_id;
            const storeIdContext = req.user?.storeId || req.user?.store_id; // Narrowing scope

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
}
