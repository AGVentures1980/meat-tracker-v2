import { PrismaClient } from '@prisma/client';
import { startOfMonth, endOfMonth, differenceInDays, getDate } from 'date-fns';
import { MEAT_STANDARDS, GLOBAL_TARGET_PER_GUEST } from '../config/standards';

const prisma = new PrismaClient();

export class MeatEngine {
    private static AVG_CONSUMPTION_PER_PERSON = 0.5; // lbs

    /**
     * Calculates the dashboard statistics for a given store and month.
     * Logic ported from prototype:
     * - Total Lbs = Sum of all meat usage
     * - Extra Customers = Total Lbs / 0.5
     */
    static async getDashboardStats(storeId: number) {
        const now = new Date();
        const start = startOfMonth(now);
        const end = endOfMonth(now);

        // 1. Get Actual Data (Year to Date or Month to Date? Prototype implies Month)
        // We query the MeatUsage table which should be accurate if populated.
        // If empty, we might want to query OrderItems directly.
        // For V2, let's query OrderItems as the source of truth for now.

        const sales = await prisma.orderItem.findMany({
            where: {
                order: {
                    store_id: storeId,
                    order_date: {
                        gte: start,
                        lte: end
                    }
                }
            }
        });

        const totalLbsMonth = sales.reduce((acc, item) => acc + item.lbs, 0);

        // 2. Calculate Metrics
        // New Logic: Target is 1.76 lbs/guest
        const extraCustomers = Math.round(totalLbsMonth / GLOBAL_TARGET_PER_GUEST);

        // 3. Projections
        const daysPassed = getDate(now) || 1;
        const totalDaysInMonth = getDate(end);
        const dailyAverage = totalLbsMonth / daysPassed;
        const projectedTotal = dailyAverage * totalDaysInMonth;

        const topMeats = await this.getTopMeats(storeId, start, end);
        const weeklyChart = await this.getWeeklyHistory(storeId, topMeats.map(m => m.name));

        // Calculate Ideal vs Actual for Top Meats (or all meats if we expand)
        const idealComparison = topMeats.map(meat => {
            // Fuzzy match or direct lookup
            // Our DB names might differ slightly, simple normalization here if needed
            // For now, assume direct or fallback
            let standard = 0.10; // Default fallback if unknown

            // Try to find matching key
            for (const key of Object.keys(MEAT_STANDARDS)) {
                if (meat.name.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(meat.name.toLowerCase())) {
                    standard = MEAT_STANDARDS[key];
                    break;
                }
            }

            const actualPerGuest = extraCustomers > 0 ? (meat.value / extraCustomers) : 0;
            const variance = actualPerGuest - standard;

            return {
                ...meat,
                actualPerGuest,
                goalPerGuest: standard,
                variance,
                status: variance > 0.05 ? 'High' : variance < -0.05 ? 'Low' : 'Ideal'
            };
        });

        return {
            totalLbsMonth,
            extraCustomers,
            dailyAverage: Math.round(dailyAverage),
            projectedTotal: Math.round(projectedTotal),
            topMeats: idealComparison, // Replace raw topMeats with enriched data
            weeklyChart
        };
    }

    private static async getTopMeats(storeId: number, start: Date, end: Date) {
        const sales = await prisma.orderItem.groupBy({
            by: ['protein_type'],
            where: {
                order: {
                    store_id: storeId,
                    order_date: {
                        gte: start,
                        lte: end
                    }
                }
            },
            _sum: {
                lbs: true
            },
            orderBy: {
                _sum: {
                    lbs: 'desc'
                }
            },
            take: 3
        });

        return sales.map(s => ({
            name: s.protein_type,
            value: s._sum.lbs || 0
        }));
    }

    private static async getWeeklyHistory(storeId: number, topProteins: string[]) {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 6); // Last 7 days including today

        const sales = await prisma.orderItem.findMany({
            where: {
                order: {
                    store_id: storeId,
                    order_date: {
                        gte: start
                    }
                },
                protein_type: {
                    in: topProteins
                }
            },
            include: {
                order: true
            }
        });

        // Initialize last 7 days with 0
        const history: any[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

            const dayEntry: any = { day: dayName };
            topProteins.forEach(p => dayEntry[p] = 0);

            history.push(dayEntry);
        }

        // Fill Data
        sales.forEach(item => {
            const dayIndex = differenceInDays(item.order.order_date, start);
            if (dayIndex >= 0 && dayIndex < 7 && topProteins.includes(item.protein_type)) {
                history[dayIndex][item.protein_type] += item.lbs;
            }
        });

        return history;
    }

    /**
     * Calculates Network-wide BI stats using Real Inventory Logic.
     * Formula: Consumption = (Start Inv + Purchases) - End Inv
     */
    static async getNetworkBiStats() {
        const stores = await prisma.store.findMany();
        const results = [];

        for (const store of stores) {
            // 1. Get Guest Count (from Report or Orders)
            // For V2 prototype, we use the Report hack we seeded
            const report = await prisma.report.findFirst({
                where: {
                    store_id: store.id,
                    month: '2026-02-BI-WEEK'
                }
            });

            const guests = report?.extra_customers || 0; // "extra_customers" reused as guest count in seed

            // 2. Get Inventory & Purchases (Picanha only for simplicity of V2 prototype)
            // Ideally this iterates over all items
            const invRecords = await prisma.inventoryRecord.findMany({
                where: { store_id: store.id },
                orderBy: { date: 'asc' }
            });

            const purchases = await prisma.purchaseRecord.findMany({
                where: { store_id: store.id }
            });

            // Calculate Consumption
            let usedQty = 0;
            let usedValue = 0;

            if (invRecords.length >= 2) {
                const startInv = invRecords[0].quantity;
                const endInv = invRecords[invRecords.length - 1].quantity;
                const purchaseQty = purchases.reduce((acc, p) => acc + p.quantity, 0);
                const purchaseCost = purchases.reduce((acc, p) => acc + p.cost_total, 0);

                // Consumption = (Start + Purchase) - End
                usedQty = (startInv + purchaseQty) - endInv;
                usedValue = purchaseCost; // Simplification: Use purchase cost as COGS proxy for this week
            } else {
                // Fallback if missing inventory data (e.g. new store)
                usedQty = report?.total_lbs || 0;
                usedValue = usedQty * 6.50; // Est $6.50/lb
            }

            // Metrics
            const lbsPerGuest = guests > 0 ? (usedQty / guests) : 0;
            const target = 1.76;
            const variance = lbsPerGuest - target;

            const costPerGuest = guests > 0 ? (usedValue / guests) : 0;
            const costPerLb = usedQty > 0 ? (usedValue / usedQty) : 0;

            // Financial Impact
            // Impact = (Actual Lbs/Guest - Target) * Guests * AvgCost/Lb
            const impactLbs = (lbsPerGuest - target) * guests;
            const impactYTD = impactLbs * (costPerLb || 6.00);

            results.push({
                id: store.id,
                name: store.store_name,
                location: store.location,
                guests,
                usedQty,
                usedValue,
                costPerLb,
                costPerGuest,
                lbsPerGuest,
                lbsGuestVar: variance,
                costGuestVar: costPerGuest - 10.50, // Mock Plan Cost $10.50
                impactYTD,
                status: Math.abs(variance) < 0.1 ? 'Optimal' : variance > 0 ? 'Warning' : 'Critical'
            });
        }

        return results;
    /**
     * Calculates the "Report Card" for the entire network for a specific Year/Week.
     */
    static async getNetworkReportCard(year: number, week: number) {
        // 1. Determine Date Range for the selected Fiscal Week
        // For prototype V2, we assume "Current Week" is the one seeded.
        // We will just fetch ALL current inventory/purchase data as if it belongs to this week.
        const stores = await prisma.store.findMany();

        // Aggregators
        let totalGuests = 0;
        let totalUsedQty = 0;
        let totalUsedValue = 0;

        for (const store of stores) {
            const report = await prisma.report.findFirst({
                where: { store_id: store.id, month: '2026-02-BI-WEEK' }
            });
            const guests = report?.extra_customers || 0;

            const invRecords = await prisma.inventoryRecord.findMany({
                where: { store_id: store.id },
                orderBy: { date: 'asc' }
            });
            const purchases = await prisma.purchaseRecord.findMany({
                where: { store_id: store.id }
            });

            if (invRecords.length >= 2) {
                const startInv = invRecords[0].quantity;
                const endInv = invRecords[invRecords.length - 1].quantity;
                const purchaseQty = purchases.reduce((acc, p) => acc + p.quantity, 0);
                const purchaseCost = purchases.reduce((acc, p) => acc + p.cost_total, 0);

                totalUsedQty += (startInv + purchaseQty) - endInv;
                totalUsedValue += purchaseCost;
                totalGuests += guests;
            } else {
                // Fallback
                const q = report?.total_lbs || 0;
                totalUsedQty += q;
                totalUsedValue += q * 6.00;
                totalGuests += guests;
            }
        }

        // Metrics - Weekly
        const lbsPerGuest = totalGuests > 0 ? (totalUsedQty / totalGuests) : 0;
        const costPerGuest = totalGuests > 0 ? (totalUsedValue / totalGuests) : 0;
        const planLbsPerGuest = 1.76;

        // Metrics - Historical (Mocked for V2 Demo as we don't have 12 weeks of data)
        // In V3, this would query aggregated data from previous weeks.
        const lbsPerGuest12UkAvg = 1.77;
        const lbsPerGuestPTD = 1.80; // Slightly higher
        const lbsPerGuestYTD = 1.79; // Slightly higher
        const planLbsPerGuestYTD = 1.76;

        // Variance Impact YTD calculation
        // Impact = (Actual YTD - Plan YTD) * Total Guests YTD (approx Week * 8 for 2 months) * Cost/Lb
        const estimatedGuestsYTD = totalGuests * 8; // Mock multiplier for 8 weeks
        const avgCostPerLb = totalUsedQty > 0 ? (totalUsedValue / totalUsedQty) : 6.00;
        const impactYTD = (lbsPerGuestYTD - planLbsPerGuestYTD) * estimatedGuestsYTD * avgCostPerLb;

        return {
            year,
            week,
            costPerGuest,
            lbsPerGuest,
            planLbsPerGuest,
            lbsPerGuest12UkAvg,
            lbsPerGuestPTD,
            lbsPerGuestYTD,
            planLbsPerGuestYTD,
            impactYTD
        };
    }
}
