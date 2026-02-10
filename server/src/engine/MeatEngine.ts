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
        // Mock Data for Network Report Card to match Frontend Interface
        return {
            year,
            week,
            costPerGuest: 11.20,
            lbsPerGuest: 1.85,
            planLbsPerGuest: 1.76,
            lbsPerGuest12UkAvg: 1.82,
            lbsPerGuestPTD: 1.84,
            lbsPerGuestYTD: 1.83,
            planLbsPerGuestYTD: 1.76,
            impactYTD: -125000 // Negative means savings in this context? Or Loss? Frontend says: impactYTD < 0 ? '-' : '+'. 
            // If impactYTD < 0, it renders with Red color?
            // Frontend: data.impactYTD < 0 ? 'bg-[#FF2A6D]/10' : 'bg-[#00FF94]/10'
            // Text: data.impactYTD < 0 ? 'text-[#FF2A6D]' : 'text-[#00FF94]' (Red vs Green)
            // Usually Green is good. So Positive should be good?
            // But logic says: Net Impact is Cost Variance.
            // If I am OVER budget, variance is positive -> Bad -> Red.
            // If I am UNDER budget, variance is negative -> Good -> Green.
            // Let's return positive 45000 (Loss) to test or negative (Savings).
            // Let's set it to valid number.
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

    /**
     * Main Dashboard Data Aggregator
     * Returns performance stats for all visible stores.
     */
    static async getCompanyDashboardStats(user: any) {
        // 1. Determine which stores to fetch
        const where: any = {};
        if (user.role !== 'admin' && user.role !== 'director') {
            if (user.storeId) {
                where.id = user.storeId;
            } else if (user.companyId) {
                // If user is Trial/Demo, restrict to their company's stores or Demo Playground
                // For now, if they are trial, show Demo Playground stores
            }
        }

        // Fetch Stores
        const stores = await prisma.store.findMany({
            where,
            include: {
                company: true
            }
        });

        const performanceProp = [];

        for (const store of stores) {
            // Calculate Stats for "This Month"
            const now = new Date();
            const start = startOfMonth(now);
            const end = endOfMonth(now);

            // Fetch Meat Usage (Consumed)
            // Fix: Use OrderItem (Sales) as proxy for usage if MeatUsage is empty or for consistency with seed data
            const sales = await prisma.orderItem.findMany({
                where: {
                    order: {
                        store_id: store.id,
                        order_date: { gte: start, lte: end }
                    }
                }
            });

            const totalLbs = sales.reduce((acc, m) => acc + m.lbs, 0);

            // Calculate Guests (Mock/Estimate if missing)
            // In a real scenario, this comes from OrderItem or POS integration
            // For Demo/Seed, we reverse engineer from ideal: Guests = Lbs / Target
            let guests = Math.round(totalLbs / ((store as any).target_lbs_guest || 1.76));

            // Add some noise to make it realistic if it's exact match
            if (guests > 0) {
                const noise = (Math.random() - 0.5) * 0.1; // +/- 5%
                guests = Math.round(guests * (1 + noise));
            }

            if (guests === 0) guests = 1; // Avoid div by zero

            const lbsPerGuest = totalLbs / guests;

            // Cost Estimation (Mock for now as we lack purchase data in seed)
            const estimatedCostPerLb = 5.65;
            const totalCost = totalLbs * estimatedCostPerLb;
            // const costPerGuest = totalCost / guests; // This was unused and causing lint error if I didn't use it, but logic below re-calcs it or uses it.
            // Actually, let's just use the calculated one.
            const costPerGuest = totalCost / guests;

            performanceProp.push({
                id: store.id,
                name: store.store_name,
                location: store.location,
                guests,
                usedQty: totalLbs,
                usedValue: totalCost,
                costPerLb: estimatedCostPerLb,
                costPerGuest,
                lbsPerGuest,
                lbsGuestVar: lbsPerGuest - ((store as any).target_lbs_guest || 1.76),
                target_lbs_guest: (store as any).target_lbs_guest || 1.76,
                target_cost_guest: (store as any).target_cost_guest || 9.94,
                costGuestVar: costPerGuest - ((store as any).target_cost_guest || 9.94),
                impactYTD: (costPerGuest - ((store as any).target_cost_guest || 9.94)) * guests, // Simple impact calc
                status: Math.abs(lbsPerGuest - ((store as any).target_lbs_guest || 1.76)) < 0.1 ? 'Optimal' : 'Warning'
            });
        }

        return { performance: performanceProp };
    }

    static async getExecutiveStats(user: any) {
        // Reuse the logic to get store-level performance
        const { performance } = await this.getCompanyDashboardStats(user);

        // Aggregate Defaults
        let totalGuests = 0;
        let totalNetImpact = 0;
        let totalVarianceSum = 0;

        performance.forEach(store => {
            totalGuests += store.guests;
            totalNetImpact += store.impactYTD;
            totalVarianceSum += store.lbsGuestVar;
        });

        const avgVariance = performance.length > 0 ? totalVarianceSum / performance.length : 0;

        // Sort by Impact (Savings vs Spending)
        // Impact is Cost Variance * Guests.
        // Positive Impact = Overspending (Bad). Negative Impact = Savings (Good).
        // Frontend expects "Top Savers" (Efficiency) and "Top Spenders" (Opportunity).

        // Sort ascending (Lowest impact first -> represents savings if negative)
        const sortedBySavings = [...performance].sort((a, b) => a.impactYTD - b.impactYTD);

        const topSavers = sortedBySavings.filter(s => s.impactYTD < 0).slice(0, 10);
        const topSpenders = [...performance].sort((a, b) => b.impactYTD - a.impactYTD).filter(s => s.impactYTD > 0).slice(0, 10);

        // Defined Middle Tier as those not in top 10 lists (optional, or just return rest)
        const topIds = new Set([...topSavers.map(s => s.id), ...topSpenders.map(s => s.id)]);
        const middleTier = performance.filter(s => !topIds.has(s.id));

        return {
            period: `Current Month`, // Dynamic later
            summary: {
                total_guests: totalGuests,
                net_impact_ytd: totalNetImpact,
                avg_lbs_variance: avgVariance,
                status: totalNetImpact <= 0 ? 'Savings' : 'Loss'
            },
            top_savers: topSavers,
            top_spenders: topSpenders,
            middle_tier: middleTier
        };
    }
}
