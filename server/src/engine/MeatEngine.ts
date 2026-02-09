import { PrismaClient } from '@prisma/client';
import { startOfMonth, endOfMonth, differenceInDays, getDate } from 'date-fns';
import { MEAT_STANDARDS, GLOBAL_TARGET_PER_GUEST } from '../config/standards';

const prisma = new PrismaClient();

export class MeatEngine {
    private static AVG_CONSUMPTION_PER_PERSON = 0.5; // lbs

    /**
     * Helper to fetch a system setting with a fallback
     */
    static async getSetting(key: string, fallback: any): Promise<any> {
        try {
            const setting = await (prisma as any).systemSettings.findUnique({
                where: { key }
            });
            if (!setting) return fallback;
            if (setting.type === 'number') return parseFloat(setting.value);
            if (setting.type === 'json') return JSON.parse(setting.value);
            return setting.value;
        } catch {
            return fallback;
        }
    }

    /**
     * Calculates the dashboard statistics for a given store and month.
     */
    static async getDashboardStats(storeId: number) {
        // Fetch dynamic standards & targets
        const standards = await this.getSetting('meat_standards', MEAT_STANDARDS);
        const globalTarget = await this.getSetting('global_target_lbs_guest', GLOBAL_TARGET_PER_GUEST);

        const storeData = await (prisma as any).store.findUnique({
            where: { id: storeId },
            include: {
                inventory_records: { orderBy: { date: 'desc' }, take: 2 },
                purchase_records: true,
                reports: { orderBy: { generated_at: 'desc' }, take: 1 }
            }
        });

        const now = new Date();
        const start = startOfMonth(now);
        const end = endOfMonth(now);

        const sales = await prisma.orderItem.findMany({
            where: {
                order: {
                    store_id: storeId,
                    order_date: { gte: start, lte: end }
                }
            }
        });

        const STORE_COST_TARGET = storeData?.target_cost_guest || 9.94;
        const totalLbsMonth = sales.reduce((acc, item) => acc + item.lbs, 0);

        const STORE_LBS_TARGET = storeData?.target_lbs_guest || globalTarget;
        const extraCustomers = Math.round(totalLbsMonth / STORE_LBS_TARGET);

        const daysPassed = getDate(now) || 1;
        const totalDaysInMonth = getDate(end);
        const dailyAverage = totalLbsMonth / daysPassed;
        const projectedTotal = dailyAverage * totalDaysInMonth;

        const topMeats = await this.getTopMeats(storeId, start, end);
        const weeklyChart = await this.getWeeklyHistory(storeId, topMeats.map(m => m.name));

        return {
            totalLbsMonth,
            extraCustomers,
            projectedTotal,
            lbsPerGuest: STORE_LBS_TARGET,
            costPerGuest: STORE_COST_TARGET,
            topMeats,
            weeklyChart
        };
    }

    private static async getTopMeats(storeId: number, start: Date, end: Date) {
        const standards = await this.getSetting('meat_standards', MEAT_STANDARDS);
        const sales = await prisma.orderItem.findMany({
            where: {
                order: {
                    store_id: storeId,
                    order_date: { gte: start, lte: end }
                }
            }
        });

        const meatSummary: Record<string, number> = {};
        sales.forEach(item => {
            const protein = item.protein_type || 'Unknown';
            meatSummary[protein] = (meatSummary[protein] || 0) + item.lbs;
        });

        return Object.entries(meatSummary).map(([name, actual]) => {
            const standard = standards[name] || 0.10;
            return {
                name,
                actual,
                ideal: Math.round(actual * 0.98),
                trend: Math.random() > 0.5 ? 'up' : 'down'
            };
        }).sort((a, b) => b.actual - a.actual).slice(0, 5);
    }

    private static async getWeeklyHistory(storeId: number, proteins: string[]) {
        // Mock weekly history for now
        return [
            { name: 'Mon', value: 450 },
            { name: 'Tue', value: 520 },
            { name: 'Wed', value: 480 },
            { name: 'Thu', value: 610 },
            { name: 'Fri', value: 750 },
            { name: 'Sat', value: 890 },
            { name: 'Sun', value: 720 },
        ];
    }

    static async getNetworkBiStats(year?: number, week?: number) {
        const stores = await prisma.store.findMany();
        const storeIds = stores.map(s => s.id);

        const y = year || 2026;
        const w = week || 9;
        const periodKey = `${y}-W${w}`;

        const reports = await prisma.report.findMany({
            where: { store_id: { in: storeIds }, month: periodKey }
        });

        const allInvRecords = await (prisma as any).inventoryRecord.findMany({
            where: { store_id: { in: storeIds } },
            orderBy: [{ store_id: 'asc' }, { date: 'asc' }]
        });

        return {
            totalStores: stores.length,
            activeReporting: reports.length,
            networkYield: 98.4,
            unaccountedCost: 45200.50
        };
    }

    static async getNetworkReportCard(year: number, week: number) {
        return {
            stores: [
                { id: 1, name: 'Dallas', status: 'optimal', yield: 99.2 },
                { id: 2, name: 'Fort Worth', status: 'warning', yield: 96.5 },
                { id: 3, name: 'Addison', status: 'optimal', yield: 98.8 }
            ]
        };
    }

    static async getCompanyAggregateStats(year: number, week: number) {
        return {
            totalPurchased: 154000,
            totalConsumed: 151500,
            yieldPercentage: 98.37,
            period: `W${week} ${year}`
        };
    }
}
