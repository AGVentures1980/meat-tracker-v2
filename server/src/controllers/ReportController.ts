import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { MeatEngine } from '../engine/MeatEngine';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns';

const prisma = new PrismaClient();

const getDateRange = (range: string = 'this-month') => {
    const now = new Date();
    switch (range) {
        case 'today':
            return { start: startOfDay(now), end: endOfDay(now) };
        case 'this-week':
            return { start: startOfWeek(now), end: endOfWeek(now) };
        case 'last-month': {
            const lastMonth = subMonths(now, 1);
            return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
        }
        case 'ytd':
            return { start: startOfYear(now), end: endOfDay(now) };
        case 'this-month':
        default:
            return { start: startOfMonth(now), end: endOfMonth(now) };
    }
};

export class ReportController {
    /**
     * Resumo Executivo: Visagem completa da rede com impacto financeiro.
     */
    static async getExecutiveSummary(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const range = req.query.range as string;
            console.log(`[ReportController] Generating Executive Summary for user: ${user?.email} (${user?.role}) range: ${range}`);

            const { start, end } = getDateRange(range);
            console.log(`[ReportController] Date Range: ${start.toISOString()} to ${end.toISOString()}`);

            const stats = await MeatEngine.getExecutiveStats(user, start, end);
            console.log(`[ReportController] Stats generated successfully. Summary:`, stats.summary);

            return res.json({
                summary: stats.summary,
                performance: stats.performance,
                top_savers: stats.top_savers,
                top_spenders: stats.top_spenders,
                period: { start, end }
            });
        } catch (error) {
            console.error('[ReportController] Report Error (Executive Summary):', error);
            if (error instanceof Error) {
                console.error('[ReportController] Stack:', error.stack);
            }
            return res.status(500).json({ error: 'Failed to generate executive summary report' });
        }
    }

    /**
     * Daily Flash Report: Snapshot da atividade operacional das últimas 24h.
     */
    static async getFlashReport(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const now = new Date();
            const start = startOfDay(now);
            const end = endOfDay(now);

            const stores = await prisma.store.findMany({
                where: user.role !== 'admin' && user.role !== 'director' ? { id: user.storeId } : {},
                include: {
                    orders: {
                        where: {
                            order_date: { gte: start, lte: end }
                        },
                        include: { items: true }
                    }
                }
            });

            const flashData = stores.map(store => {
                const totalLbs = store.orders.reduce((acc, order) => {
                    return acc + order.items.reduce((sum, item) => sum + item.lbs, 0);
                }, 0);

                return {
                    name: store.store_name,
                    location: store.location,
                    todayLbs: totalLbs,
                    status: totalLbs > 0 ? 'Active' : 'Standby'
                };
            });

            return res.json(flashData);
        } catch (error) {
            console.error('Report Error (Flash):', error);
            return res.status(500).json({ error: 'Failed to generate flash report' });
        }
    }

    /**
     * Análise de Variância: Deep dive em proteína vs padrão por loja.
     */
    static async getVarianceAnalysis(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const { storeId, range } = req.query;
            const { start, end } = getDateRange(range as string);

            const id = storeId ? parseInt(storeId as string) : user.storeId;

            if (!id && user.role !== 'admin' && user.role !== 'director') {
                return res.status(400).json({ error: 'Store ID required for variance analysis' });
            }

            const targetId = id || (await prisma.store.findFirst())?.id;
            if (!targetId) return res.status(404).json({ error: 'No stores found' });

            const stats = await MeatEngine.getDashboardStats(targetId, start, end);
            console.log(`[ReportController] Variance Analysis for store ${targetId} generated ${stats.topMeats.length} items.`);

            return res.json({
                storeId: targetId,
                storeName: (await prisma.store.findUnique({ where: { id: targetId } }))?.store_name,
                variance: stats.topMeats.map((m: any) => ({
                    protein: m.name,
                    actual: m.actual,
                    ideal: m.ideal,
                    variance: m.actual - m.ideal,
                    status: m.actual <= m.ideal ? 'Saving' : 'Loss'
                }))
            });
        } catch (error) {
            console.error('Report Error (Variance):', error);
            return res.status(500).json({ error: 'Failed to generate variance report' });
        }
    }

    /**
     * Inventory Report: Histórico de contagens e compras.
     */
    static async getInventoryReport(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const { storeId, range } = req.query;
            const { start, end } = getDateRange(range as string);

            const id = storeId ? parseInt(storeId as string) : user.storeId;
            if (!id && user.role !== 'admin' && user.role !== 'director') {
                return res.status(400).json({ error: 'Store ID required' });
            }

            const targetId = id || (await prisma.store.findFirst())?.id;
            const history = await MeatEngine.getInventoryHistory(targetId, start, end);
            console.log(`[ReportController] Inventory History for store ${targetId}: Purchases: ${history.purchases.length}, Counts: ${history.counts.length}`);


            return res.json({
                storeId: targetId,
                history
            });
        } catch (error) {
            console.error('Report Error (Inventory):', error);
            return res.status(500).json({ error: 'Failed to generate inventory report' });
        }
    }
    /**
     * Meat Prices Report: Purchase analysis and variance alerts.
     */
    static async getMeatPrices(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const { range } = req.query;
            const { start, end } = getDateRange(range as string);

            // Fetch ALL Purchase Records across company to calculate benchmark averages
            const companyWhere: any = {
                date: { gte: start, lte: end },
                store: { company_id: user.companyId || user.company_id }
            };

            const allPurchases = await prisma.purchaseRecord.findMany({
                where: companyWhere,
                include: { store: true }
            });

            if (allPurchases.length === 0) {
                return res.json([]);
            }

            // 1. Calculate Network Average per Protein (across all company stores)
            const networkTotals: Record<string, { totalCost: number, totalQty: number }> = {};
            allPurchases.forEach(p => {
                if (!networkTotals[p.item_name]) networkTotals[p.item_name] = { totalCost: 0, totalQty: 0 };
                networkTotals[p.item_name].totalCost += p.cost_total;
                networkTotals[p.item_name].totalQty += p.quantity;
            });

            const networkAverages: Record<string, number> = {};
            Object.keys(networkTotals).forEach(protein => {
                const t = networkTotals[protein];
                networkAverages[protein] = t.totalQty > 0 ? t.totalCost / t.totalQty : 0;
            });

            // 2. Filter data for the specific report (Scope by Store if Manager)
            const purchases = (user.role === 'manager' && user.storeId)
                ? allPurchases.filter(p => p.store_id === user.storeId)
                : allPurchases;

            // 2. Group by Store -> Protein -> Latest Price (or Avg Price for period)
            // User requested "what each store pays". If multiple purchases, Weighted Avg is best.
            const storeStats: Record<string, Record<string, { totalCost: number, totalQty: number, storeName: string, location: string }>> = {};

            purchases.forEach(p => {
                const storeKey = p.store_id.toString();
                if (!storeStats[storeKey]) storeStats[storeKey] = {};
                if (!storeStats[storeKey][p.item_name]) {
                    storeStats[storeKey][p.item_name] = {
                        totalCost: 0,
                        totalQty: 0,
                        storeName: p.store.store_name,
                        location: p.store.location
                    };
                }
                storeStats[storeKey][p.item_name].totalCost += p.cost_total;
                storeStats[storeKey][p.item_name].totalQty += p.quantity;
            });

            // 3. Format Response
            const reportData: any[] = [];

            Object.keys(storeStats).forEach(storeId => {
                const proteins = storeStats[storeId];
                Object.keys(proteins).forEach(protein => {
                    const data = proteins[protein];
                    const avgPrice = data.totalQty > 0 ? data.totalCost / data.totalQty : 0;
                    const networkAvg = networkAverages[protein] || 0;
                    const variance = avgPrice - networkAvg;
                    const variancePercent = networkAvg > 0 ? (variance / networkAvg) * 100 : 0;

                    reportData.push({
                        store: data.storeName,
                        location: data.location,
                        protein: protein,
                        avgPrice: avgPrice,
                        networkAvg: networkAvg,
                        variance: variance,
                        variancePercent: variancePercent,
                        status: variancePercent > 5 ? 'High' : (variancePercent < -5 ? 'Low' : 'Normal')
                    });
                });
            });

            // Sort Alphabetically by Protein then Store
            reportData.sort((a, b) => {
                const pDiff = a.protein.localeCompare(b.protein);
                if (pDiff !== 0) return pDiff;
                return a.store.localeCompare(b.store);
            });

            return res.json(reportData);

        } catch (error) {
            console.error('Report Error (Meat Prices):', error);
            return res.status(500).json({ error: 'Failed to generate meat prices report' });
        }
    }
}
