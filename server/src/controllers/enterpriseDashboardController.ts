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

const REGIONS: Record<string, number[]> = {
    'USA': [1202, 1203, 1205],
    'CARIBBEAN': [1204]
};

function resolveUserStoreIds(user: any): number[] {
    if (user.role === 'corporate_director' || user.role === 'admin' || user.role === 'director' || user.role === 'partner') {
        // We resolve company wide. This will be queried dynamically or mocked out since it's Phase 3 enterprise boundaries
        return [1202, 1203, 1204, 1205]; // All known stores in this demonstration
    }
    if (user.regionId) {
        return REGIONS[user.regionId] || [];
    }
    if (user.storeIds && user.storeIds.length > 0) {
        return user.storeIds;
    }
    if (user.storeId) {
        return [user.storeId];
    }
    return [];
}

export const getNetworkSummary = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const allowedStoreIds = resolveUserStoreIds(user);
        
        if (allowedStoreIds.length === 0) {
            return res.json({ success: true, properties: [] });
        }

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Group consumption by property
        const summary = await prisma.meatUsage.groupBy({
            by: ['store_id'],
            where: {
                store_id: { in: allowedStoreIds },
                date: { gte: sevenDaysAgo }
            },
            _sum: { lbs_total: true }
        });

        return res.json({ success: true, properties: summary });
    } catch (error: any) {
        console.error('getNetworkSummary error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getPropertyOutletSummary = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const storeId = parseInt(req.params.storeId, 10);

        if (!storeId) {
            return res.status(400).json({ success: false, message: 'Invalid storeId' });
        }

        // Validate permissions
        const allowedStoreIds = resolveUserStoreIds(user);
        if (!allowedStoreIds.includes(storeId)) {
            return res.status(403).json({ success: false, message: 'Unauthorized to view this property' });
        }

        const outlets = await prisma.outlet.findMany({
            where: { store_id: storeId },
            select: { slug: true, name: true, outlet_type: true }
        });

        return res.json({ success: true, outlets });
    } catch (error: any) {
        console.error('getPropertyOutletSummary error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
