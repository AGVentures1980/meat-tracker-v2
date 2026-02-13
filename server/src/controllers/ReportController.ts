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
            const { start, end } = getDateRange(range);

            const stats = await MeatEngine.getExecutiveStats(user, start, end);

            return res.json({
                summary: stats.summary,
                performance: stats.performance,
                top_savers: stats.top_savers,
                top_spenders: stats.top_spenders,
                period: { start, end }
            });
        } catch (error) {
            console.error('Report Error (Executive Summary):', error);
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
            return res.json({
                storeId: targetId,
                variance: stats.topMeats.map((m: any) => ({
                    protein: m.name,
                    actual: m.actual,
                    ideal: m.ideal,
                    variance: m.actual - m.ideal
                }))
            });
        } catch (error) {
            console.error('Report Error (Variance):', error);
            return res.status(500).json({ error: 'Failed to generate variance report' });
        }
    }
}
