import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { FeatureFlags } from '../utils/featureFlags';

const prisma = new PrismaClient();

export const getEnterpriseMetrics = async (req: Request, res: Response) => {
    try {
        if (!FeatureFlags.FF_ENTERPRISE_DASHBOARD) {
            return res.status(403).json({ success: false, message: 'Feature flag FF_ENTERPRISE_DASHBOARD is disabled' });
        }

        const store_id = Number(req.query.store_id || (req as any).user?.store_id);
        const company_id = (req as any).user?.company_id;

        if (!store_id) {
            return res.status(400).json({ success: false, message: 'Missing store_id' });
        }

        // Today's boundaries
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fetch Channel Consumption
        const channels = await prisma.meatUsage.groupBy({
            by: ['source_type'],
            where: {
                store_id,
                date: today
            },
            _sum: {
                lbs_total: true
            }
        });

        // Fetch Forecast Accuracy
        const forecastLogs = await prisma.forecastIntelligenceLog.findMany({
            where: { store_id },
            orderBy: { business_date: 'desc' },
            take: 7
        });

        // Fetch Inbound Variances (Recent)
        const inbound = await prisma.invoiceRecord.findMany({
            where: { store_id, weight_discrepancy_lb: { not: null } },
            orderBy: { date: 'desc' },
            take: 10
        });

        res.json({
            success: true,
            data: {
                channelConsumption: channels,
                forecastIntelligence: forecastLogs,
                inboundVariances: inbound
            }
        });

    } catch (error: any) {
        console.error('Enterprise Dashboard Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
