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
}
