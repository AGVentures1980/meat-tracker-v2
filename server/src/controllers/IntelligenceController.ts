import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { MeatEngine } from '../engine/MeatEngine';

const prisma = new PrismaClient();

export class IntelligenceController {
    /**
     * GET /api/v1/intelligence/anomalies
     * Identifies stores with consumption variance > 15% vs group average
     */
    static async getAnomalies(req: Request, res: Response) {
        try {
            const stats = await MeatEngine.getExecutiveStats((req as any).user);
            const anomalies = stats.performance.filter(store => {
                const variancePct = (Math.abs(store.lbsGuestVar) / store.target_lbs_guest) * 100;
                return variancePct > 15;
            });

            return res.json({
                success: true,
                anomalies: anomalies.map(a => ({
                    storeId: a.id,
                    name: a.name,
                    variance: (a.lbsGuestVar / a.target_lbs_guest) * 100,
                    lbsPerGuest: a.lbsPerGuest,
                    target: a.target_lbs_guest,
                    impact: a.impactYTD
                }))
            });
        } catch (error) {
            return res.status(500).json({ success: false, error: 'Failed to fetch anomalies' });
        }
    }

    /**
     * GET /api/v1/intelligence/supply-suggestions
     * Suggests order quantities based on inventory and consumption
     */
    static async getSupplySuggestions(req: Request, res: Response) {
        try {
            const storeId = (req as any).user?.storeId || 1;

            // Fetch current inventory and recent purchases
            // For now, using MeatEngine logic to estimate ideal vs actual
            const stats = await MeatEngine.getDashboardStats(storeId);

            const suggestions = stats.topMeats.map(meat => {
                const weeklyUsage = meat.actual * 0.25; // Estimate weekly usage as 25% of monthly
                const safetyStock = weeklyUsage * 1.5; // 1.5 weeks of safety stock
                const suggestedOrder = Math.max(0, safetyStock - (meat.actual * 0.1)); // Mock on-hand as 10%

                return {
                    protein: meat.name,
                    currentUsage: meat.actual,
                    suggestedOrder: parseFloat(suggestedOrder.toFixed(1)),
                    unit: 'LB',
                    priority: suggestedOrder > safetyStock * 0.5 ? 'High' : 'Normal'
                };
            });

            return res.json({
                success: true,
                suggestions
            });
        } catch (error) {
            return res.status(500).json({ success: false, error: 'Failed to fetch suggestions' });
        }
    }
}
