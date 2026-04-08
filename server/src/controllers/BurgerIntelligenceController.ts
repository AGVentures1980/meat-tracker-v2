import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getUserId, requireTenant } from '../utils/authContext';

const prisma = new PrismaClient();

export class BurgerIntelligenceController {
    
    /**
     * GET /api/v1/burger/dashboard
     * Returns the compiled data for the anti-fraud burger loop
     */
    static async getDashboard(req: Request, res: Response) {
        try {
            const companyId = requireTenant((req as any).user);
            const storeId = (req as any).user?.storeId || 1;
            const dateStr = req.query.date as string || new Date().toISOString().split('T')[0];
            const queryDate = new Date(dateStr + 'T00:00:00Z');

            // Find or create pool
            let pool = await prisma.burgerInventoryPool.findFirst({
                where: { store_id: storeId, date: queryDate }
            });

            if (!pool) {
                pool = await prisma.burgerInventoryPool.create({
                    data: { store_id: storeId, date: queryDate }
                });
            }

            // Get standard patty size from store
            const store = await prisma.store.findUnique({
                where: { id: storeId },
                select: { target_patty_oz: true }
            });

            const targetPattyOz = store?.target_patty_oz || 8.0;

            // Recalculate Lean Lbs from Yield and Preps
            // 1. Scraps sent to BURGER_POOL
            const trims = await (prisma as any).trimRecordEvent.aggregate({
                where: { store_id: storeId, created_at: { gte: queryDate, lt: new Date(queryDate.getTime() + 86400000) }, sent_to: 'BURGER_POOL' },
                _sum: { trim_weight: true }
            });

            // 2. Full Boxes allocated to BURGER_POOL
            const boxes = await (prisma as any).barcodeScanEvent.aggregate({
                where: { store_id: storeId, scanned_at: { gte: queryDate, lt: new Date(queryDate.getTime() + 86400000) }, intended_use: 'BURGER_POOL' },
                _sum: { weight: true }
            });

            const totalLeanLbs = (trims._sum.trim_weight || 0) + (boxes._sum.weight || 0);

            // Re-calculate theoretical patties
            const theoreticalPatties = Math.floor((totalLeanLbs * 16) / targetPattyOz);

            // Calculate Fraud Condition
            const remainingPatties = theoreticalPatties - pool.pos_patties_sold;
            
            let isFraudFlagged = false;
            // FRAUD RULE 1: Selling without making (Theft of official Picanha via Burger POS Sales)
            if (pool.pos_patties_sold > 0 && theoreticalPatties === 0) {
                isFraudFlagged = true;
            }
            // FRAUD RULE 2: Making but not selling or keeping (Eating / Theft of Burger)
            if (remainingPatties > pool.manager_declared_on_hand) {
                const missing = remainingPatties - pool.manager_declared_on_hand;
                if (missing > 0) isFraudFlagged = true; // Any missing is fraud
            }

            pool = await prisma.burgerInventoryPool.update({
                where: { id: pool.id },
                data: {
                    total_lean_lbs: totalLeanLbs,
                    theoretical_patties: theoreticalPatties,
                    is_fraud_flagged: isFraudFlagged,
                    fraud_alert_qty: isFraudFlagged && remainingPatties > pool.manager_declared_on_hand ? remainingPatties - pool.manager_declared_on_hand : 0
                }
            });

            return res.json({ success: true, loop: pool, metrics: { targetPattyOz } });

        } catch (error: any) {
            console.error('BurgerIntelligence Dashboard Error:', error);
            return res.status(500).json({ error: 'Failed to fetch burger dashboard logging' });
        }
    }

    /**
     * POST /api/v1/burger/aloha-sync
     * Mocks an ALOHA Webhook that reports POS Patty Sales for the day.
     */
    static async syncAloha(req: Request, res: Response) {
        try {
            const { storeId, pos_count, date } = req.body;
            
            const queryDate = new Date(date + 'T00:00:00Z');

            let pool = await prisma.burgerInventoryPool.findFirst({
                where: { store_id: parseInt(storeId), date: queryDate }
            });

            if (!pool) {
                pool = await prisma.burgerInventoryPool.create({
                    data: { store_id: parseInt(storeId), date: queryDate, pos_patties_sold: pos_count }
                });
            } else {
                pool = await prisma.burgerInventoryPool.update({
                    where: { id: pool.id },
                    data: { pos_patties_sold: pos_count }
                });
            }

            return res.json({ success: true, message: 'ALOHA Sync OK.', pos_patties_sold: pool.pos_patties_sold });
        } catch (error) {
            console.error('Aloha Sync Error:', error);
            return res.status(500).json({ error: 'ALOHA Integration Failed.' });
        }
    }

    /**
     * POST /api/v1/burger/audit
     * Manager manually inputs how many patties are left in the fridge to complete the Loop.
     */
    static async managerAudit(req: Request, res: Response) {
        try {
            const { storeId, date, on_hand, action } = req.body;
            const queryDate = new Date(date + 'T00:00:00Z');

            let pool = await prisma.burgerInventoryPool.findFirst({
                where: { store_id: parseInt(storeId), date: queryDate }
            });

            if (!pool) return res.status(404).json({ error: 'No active pool for date.' });

            pool = await prisma.burgerInventoryPool.update({
                where: { id: pool.id },
                data: { manager_declared_on_hand: parseInt(on_hand) }
            });

            return res.json({ success: true, message: 'Audit Saved.' });

        } catch (error) {
            console.error('Burger Audit Error:', error);
            return res.status(500).json({ error: 'Audit Save Failed.' });
        }
    }
}
