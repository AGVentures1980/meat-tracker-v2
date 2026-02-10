
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class NetworkHealthController {

    static async getNetworkStats(req: Request, res: Response) {
        try {
            // Get today's date range
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // 1. Count active stores (mock logic or simple count)
            const activeStores = await prisma.store.count();

            // 2. Calculate Total System Sales (Real-time aggregation from Orders)
            // Since we don't have a direct 'sales' table, we can estimate from Orders or just track Order count
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const orderCount = await prisma.order.count({
                where: {
                    order_date: {
                        gte: startOfDay
                    }
                }
            });

            // Mocking sales value based on orders for now as Order table doesn't seem to have total_price yet
            // In a real scenario, we would sum(Order.total_amount)
            const systemSales = orderCount * 45.50; // Avg ticket size assumption

            // 3. Calculate System-wide Labor %
            const systemLabor = 28.4; // Constant for now

            // 4. Alerts (Mocking for now as Alert model is missing in schema)
            const activeAlerts = 3; // Placeholder until Alert model is added

            return res.json({
                status: 'ONLINE',
                active_stores: activeStores,
                system_sales: systemSales,
                system_labor: systemLabor,
                active_alerts: activeAlerts,
                last_updated: new Date().toISOString()
            });

        } catch (error) {
            console.error('Network Health Error:', error);
            return res.status(500).json({ error: 'Failed to fetch network health' });
        }
    }
}
