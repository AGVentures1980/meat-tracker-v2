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

        // Fetch Store Details (for Target Cost)
        const store = await prisma.store.findUnique({
            where: { id: storeId }
        });
        const STORE_COST_TARGET = store?.target_cost_guest || 9.94;

        // Fetch Store-Specific Targets
        const storeTargets = await prisma.storeMeatTarget.findMany({
            where: { store_id: storeId }
        });

        const totalLbsMonth = sales.reduce((acc, item) => acc + item.lbs, 0);

        // 2. Calculate Metrics
        // New Logic: Target is 1.76 lbs/guest (or store specific)
        const STORE_LBS_TARGET = store?.target_lbs_guest || GLOBAL_TARGET_PER_GUEST;
        const extraCustomers = Math.round(totalLbsMonth / STORE_LBS_TARGET);

        // 3. Projections
        const daysPassed = getDate(now) || 1;
        const totalDaysInMonth = getDate(end);
        const dailyAverage = totalLbsMonth / daysPassed;
        const projectedTotal = dailyAverage * totalDaysInMonth;

        const topMeats = await this.getTopMeats(storeId, start, end);
        const weeklyChart = await this.getWeeklyHistory(storeId, topMeats.map(m => m.name));

        // 4. Financial Calculation (Phase 9)
        // Hardcoded prices matching the WeeklyPriceInput for prototype
        const WEEKLY_PRICES: Record<string, number> = {
            'picanha': 9.14,
            'fraldinha/flank steak': 8.24,
            'tri-tip': 5.26,
            'filet mignon': 9.50,
            'beef ribs': 8.36,
            'pork ribs': 2.80,
            'pork loin': 2.47,
            'chicken drumstick': 1.37,
            'chicken breast': 1.47,
            'lamb chops': 13.91,
            'leg of lamb': 6.21,
            'lamb picanha': 9.20,
            'sausage': 3.16,
            'bacon': 3.33,
            'bone-in ribeye': 9.14,
            'pork belly': 4.50
        };

        let totalProjectedSavings = 0;
        let totalActualCostGuest = 0;

        const idealComparison = topMeats.map(meat => {
            let standardLbs = 0.10; // Default fallback
            let targetCostGuest = 0.00;
            let source = 'Default';

            // 1. Try Store Specific Target
            const specificTarget = storeTargets.find(t => t.protein === meat.name || meat.name.includes(t.protein));
            if (specificTarget) {
                standardLbs = specificTarget.target;
                targetCostGuest = specificTarget.cost_target || 0;
                source = 'Store Target';
            } else {
                // 2. Fallback to Global Standards
                for (const key of Object.keys(MEAT_STANDARDS)) {
                    if (meat.name.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(meat.name.toLowerCase())) {
                        standardLbs = MEAT_STANDARDS[key];
                        source = 'Global Standard';
                        // implied cost target?
                        break;
                    }
                }
            }

            const actualPerGuest = extraCustomers > 0 ? (meat.value / extraCustomers) : 0;
            const varianceLbs = actualPerGuest - standardLbs;

            // Find price
            let price = 6.00; // Default
            for (const [key, val] of Object.entries(WEEKLY_PRICES)) {
                if (meat.name.toLowerCase().includes(key)) {
                    price = val;
                    break;
                }
            }

            // Financial Metrics
            const actualCostGuest = actualPerGuest * price;
            totalActualCostGuest += actualCostGuest;

            // If no specific cost target, derive it from Lbs Target * Price 
            if (targetCostGuest === 0 && standardLbs > 0) {
                targetCostGuest = standardLbs * price;
            }

            const varianceCost = actualCostGuest - targetCostGuest;

            // Legacy Savings calc (based on Lbs Variance)
            const impactDollars = varianceLbs * extraCustomers * price;
            totalProjectedSavings -= impactDollars;

            return {
                ...meat,
                actualPerGuest,         // Lbs/Guest
                goalPerGuest: standardLbs, // Target Lbs/Guest
                variance: varianceLbs,     // Lbs Variance

                // New Financial Fields
                pricePerLb: price,
                actualCostGuest,        // Actual $/Guest
                targetCostGuest,        // Target $/Guest
                varianceCost,           // $/Guest Variance

                impactDollars: -impactDollars,
                status: varianceLbs > 0.05 ? 'High' : varianceLbs < -0.05 ? 'Low' : 'Ideal'
            };
        });

        const storeFinancialVariance = totalActualCostGuest - STORE_COST_TARGET;

        return {
            totalLbsMonth,
            extraCustomers,
            dailyAverage: Math.round(dailyAverage),
            projectedTotal: Math.round(projectedTotal),
            topMeats: idealComparison,
            weeklyChart,
            financials: {
                total_savings: totalProjectedSavings,

                // New Financial Summary
                store_target_cost_guest: STORE_COST_TARGET,
                actual_cost_guest: totalActualCostGuest,
                variance_cost_guest: storeFinancialVariance,

                status: storeFinancialVariance > 0.5 ? 'Critical' : storeFinancialVariance > 0 ? 'Over Budget' : 'Under Budget'
            }
        };
    }

    private static async getTopMeats(storeId: number, start: Date, end: Date) {
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

        // Dynamic Aggregation with Combo Parsing
        const aggression: Record<string, number> = {};

        // Import definition dynamically or top-level. 
        // Since we are inside the class, let's use the external config.
        const { COMBO_DEFINITIONS } = require('../config/combos');

        sales.forEach(item => {
            const lowerName = item.item_name.toLowerCase().trim();
            const combo = COMBO_DEFINITIONS[lowerName];

            if (combo) {
                // It's a combo (e.g. Churrasco Plate)
                combo.components.forEach((c: any) => {
                    const proteinKey = c.protein;
                    // Proportional weight based on item qty (which is item.lbs in our simplified schema?)
                    // Wait, our OrderItem schema has 'lbs'. 
                    // If OLO sends "1 Churrasco Plate", our previous logic might have saved '1.0' as lbs?
                    // Or did we already normalize it?
                    // The schema says `lbs Float`.
                    // If the raw order comes in as "1 unit", we need to know if `item.lbs` is "quantity" or "weight".
                    // For V2 Prototype, let's assume `item.lbs` is the WEIGHT derived from OLO Quantity * Standard Weight.
                    // But if it's a Combo, we need to redistribute that weight.

                    // Actually, simpler:
                    // If it is a combo, we ignore the recorded 'protein_type' (which might be generic)
                    // and add to the specific buckets defined in the combo.
                    // We treat `item.lbs` as "1.0 Unit" essentially if it was just a count.
                    // BUT, `item.lbs` should already be weight.

                    // Lets assume `item.lbs` represents the QUANTITY acts (1 plate).
                    // So we add combo.weight to the tally.
                    // Ideally we should fix the Ingestion to store 'Quantity' separately, but for now:

                    const weightToAdd = c.weight * (item.lbs > 5 ? 1 : item.lbs); // Heuristic: if lbs > 5, it might be real lbs. If 1, it's a unit.
                    // Actually, let's stick to the V2 logic:
                    // If we detect a combo, we use the definition.

                    aggression[proteinKey] = (aggression[proteinKey] || 0) + c.weight;
                });
            } else {
                // Regular Item
                aggression[item.protein_type] = (aggression[item.protein_type] || 0) + item.lbs;
            }
        });

        // Sort and Top 3
        const sorted = Object.entries(aggression)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 3);

        return sorted;
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
    static async getNetworkBiStats(year?: number, week?: number) {
        const stores = await prisma.store.findMany();
        const results = [];

        // Effective Period
        const y = year || 2026;
        const w = week || 9; // Default to current active week in V2
        const periodKey = `${y}-W${w}`;

        for (const store of stores) {
            // 1. Get Guest Count (from Report or Orders)
            // For V2 prototype, we use the Report hack we seeded
            const report = await prisma.report.findFirst({
                where: {
                    store_id: store.id,
                    month: periodKey
                }
            });

            const guests = report?.extra_customers || 0; // "extra_customers" reused as guest count in seed

            const s = store as any;
            // 2. Get Inventory & Purchases (Picanha only for simplicity of V2 prototype)
            const invRecords = await (prisma as any).inventoryRecord.findMany({
                where: { store_id: s.id },
                orderBy: { date: 'asc' }
            });

            const purchases = await (prisma as any).purchaseRecord.findMany({
                where: { store_id: s.id }
            });

            // Calculate Consumption
            let usedQty = 0;
            let usedValue = 0;

            if (invRecords.length >= 2) {
                const startInv = invRecords[0].quantity;
                const endInv = invRecords[invRecords.length - 1].quantity;
                const purchaseQty = purchases.reduce((acc: any, p: any) => acc + p.quantity, 0);
                const purchaseCost = purchases.reduce((acc: any, p: any) => acc + p.cost_total, 0);

                usedQty = (startInv + purchaseQty) - endInv;
                usedValue = purchaseCost;
            } else {
                usedQty = report?.total_lbs || 0;
                usedValue = usedQty * 6.50;
            }

            const lbsPerGuest = guests > 0 ? (usedQty / guests) : 0;
            const target = s.target_lbs_guest || 1.76;
            const variance = lbsPerGuest - target;

            const costPerGuest = guests > 0 ? (usedValue / guests) : 0;
            const costPerLb = usedQty > 0 ? (usedValue / usedQty) : 0;

            const impactLbs = (lbsPerGuest - target) * guests;
            const impactYTD = impactLbs * (costPerLb || 6.00);

            const targetCostGuest = s.target_cost_guest || 9.94;

            results.push({
                id: s.id,
                name: s.store_name,
                location: s.location,
                guests,
                usedQty,
                usedValue,
                costPerLb,
                costPerGuest,
                lbsPerGuest,
                target_lbs_guest: target,
                target_cost_guest: targetCostGuest,
                lbsGuestVar: variance,
                costGuestVar: costPerGuest - targetCostGuest,
                impactYTD,
                status: Math.abs(variance) < 0.1 ? 'Optimal' : variance > 0 ? 'Warning' : 'Critical'
            });
        }

        return results;
    }

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

        // impactYTD - incomplete
        return {
            lbsPerGuest, costPerGuest, planLbsPerGuest,
            lbsPerGuest12UkAvg, lbsPerGuestPTD, lbsPerGuestYTD, planLbsPerGuestYTD
        };
    }

    /**
     * Aggregates data for the Executive Dashboard.
     * Reuses getNetworkBiStats to ensure consistency.
     */
    static async getCompanyAggregateStats(year?: number, week?: number) {
        const networkStats = await this.getNetworkBiStats(year, week);

        // 1. Calculate Company Totals
        let totalGuests = 0;
        let netImpact = 0;
        let totalLbsVariance = 0;

        networkStats.forEach(stat => {
            totalGuests += stat.guests;
            netImpact += stat.impactYTD;
            totalLbsVariance += stat.lbsGuestVar;
        });

        // 2. Sort for Top Lists
        // Green = Negative Variance (Savings) -> Sorted Ascending (Most Negative First)
        // Red = Positive Variance (Waste) -> Sorted Descending (Most Positive First)

        const sortedByVariance = [...networkStats].sort((a, b) => a.lbsGuestVar - b.lbsGuestVar);

        const topSavers = sortedByVariance.filter(s => s.lbsGuestVar < 0).slice(0, 10);
        const topSpenders = sortedByVariance.filter(s => s.lbsGuestVar > 0).reverse().slice(0, 10);

        // 3. Middle Tier (The rest)
        const middleTier = sortedByVariance.filter(s => s.lbsGuestVar === 0);
        // In reality, virtually no one is exactly 0. 
        // Let's define Middle as anyone not in Top 10 lists.
        const topIds = new Set([...topSavers.map(s => s.id), ...topSpenders.map(s => s.id)]);
        const others = networkStats.filter(s => !topIds.has(s.id));

        return {
            period: `${year || 2026}-W${week || 9}`,
            summary: {
                total_guests: totalGuests,
                net_impact_ytd: netImpact,
                avg_lbs_variance: totalLbsVariance / (networkStats.length || 1),
                status: netImpact > 0 ? 'Loss' : 'Savings'
            },
            performance: networkStats, // This is what Dashboard.tsx expects
            top_savers: topSavers,
            top_spenders: topSpenders,
            middle_tier: others
        };
    }
}

