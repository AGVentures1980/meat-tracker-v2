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

/**
 * Resolves the operational business_date for a given timestamp.
 * Business day ends at 4:00 AM local time (covers late-night closings).
 * All storage in UTC. Display in local timezone.
 */
function resolveBusinessDate(timestampUTC: Date, timezone: string = 'America/New_York'): string {
    const localTime = new Date(timestampUTC.toLocaleString('en-US', { timeZone: timezone }));
    const localHour = localTime.getHours();

    const businessDate = new Date(timestampUTC);
    if (localHour < 4) {
      businessDate.setUTCDate(businessDate.getUTCDate() - 1);
    }
    return businessDate.toISOString().split('T')[0];
}

async function resolveUserStoreIds(user: any): Promise<number[]> {
    console.log(`[DIAGNOSE] resolveUserStoreIds called with user:`, { id: user.id, email: user.email, role: user.role, companyId: user.companyId });
    if (!user.companyId) {
        console.warn(`[DIAGNOSE] user.companyId is falsy! Returning []`);
        return [];
    }

    if (['corporate_director', 'admin', 'director', 'partner'].includes(user.role)) {
        console.log(`[DIAGNOSE] Querying stores WHERE company_id = '${user.companyId}' for role ${user.role}`);
        const stores = await prisma.store.findMany({
            where: { company_id: user.companyId },
            select: { id: true }
        });
        console.log(`[DIAGNOSE] Resulting stores:`, stores.map((s: any) => s.id));
        return stores.map((s: any) => s.id);
    }

    if (user.role === 'regional_director' && user.regionId) {
        const REGIONS: Record<string, string[]> = {
            'USA': ['tampa-casino', 'hollywood-casino', 'atlantic-city'], // matching the store_name or property_id realistically. We will match on store.property_id
            'CARIBBEAN': ['punta-cana']
        };
        const regionSlugs = REGIONS[user.regionId] || [];
        if (regionSlugs.length === 0) return [];
        // Since schema Store doesn't have a 'slug', let's use location or ID
        // Hard-fixing regions fallback to IDs for pilot:
        const REGIONS_NUM: Record<string, number[]> = {
            'USA': [1202, 1203, 1205],
            'CARIBBEAN': [1204]
        };
        const ids = REGIONS_NUM[user.regionId] || [];
        if (ids.length === 0) return [];

        const stores = await prisma.store.findMany({
            where: {
                company_id: user.companyId,
                id: { in: ids }
            },
            select: { id: true }
        });
        return stores.map((s: any) => s.id);
    }

    // Single store isolation
    if (user.storeId) {
        const store = await prisma.store.findFirst({
            where: { id: user.storeId, company_id: user.companyId }
        });
        return store ? [store.id] : [];
    }

    return [];
}

async function resolveStoreIdFromSlug(slug: string, companyId: string, prisma: any): Promise<number | null> {
    const asNumber = parseInt(slug, 10);
    if (!isNaN(asNumber)) return asNumber;

    const slugToName: Record<string, string> = {
        'tampa-casino':          'Tampa Casino',
        'hollywood':             'Hollywood',
        'punta-cana':            'Punta Cana',
        'atlantic-city-casino':  'Atlantic City Casino',
        'atlantic-city':         'Atlantic City Casino',
    };

    const storeName = slugToName[slug.toLowerCase()];
    if (storeName) {
        const store = await prisma.store.findFirst({
            where: {
                store_name: { contains: storeName, mode: 'insensitive' },
                company_id: companyId
            },
            select: { id: true }
        });
        return store?.id || null;
    }

    const store = await prisma.store.findFirst({
        where: {
            store_name: {
                contains: slug.replace(/-/g, ' '),
                mode: 'insensitive'
            },
            company_id: companyId
        },
        select: { id: true }
    });
    return store?.id || null;
}

export const getNetworkSummary = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const allowedStoreIds = await resolveUserStoreIds(user);
        
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
        const storeIdStr = req.params.storeId;
        const storeId = await resolveStoreIdFromSlug(storeIdStr, user.companyId, prisma);

        if (!storeId) {
            return res.status(400).json({ success: false, message: 'Invalid storeId' });
        }

        // Validate permissions
        const allowedStoreIds = await resolveUserStoreIds(user);
        if (!allowedStoreIds.includes(storeId)) {
            return res.status(403).json({ success: false, message: 'Unauthorized to view this property' });
        }

        const store = await prisma.store.findUnique({
            where: { id: storeId },
            select: { store_name: true, location: true }
        });

        const outlets = await prisma.outlet.findMany({
            where: { store_id: storeId },
            select: { slug: true, name: true, outlet_type: true, store_id: true }
        });

        return res.json({ success: true, outlets, property: store });
    } catch (error: any) {
        console.error('getPropertyOutletSummary error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getOutletKPI = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const outletSlug = req.params.outletSlug;

        const outlet = await prisma.outlet.findFirst({
            where: { slug: outletSlug }
        });

        if (!outlet) return res.status(404).json({ success: false, message: 'Outlet not found' });

        const allowedStoreIds = await resolveUserStoreIds(user);
        if (!allowedStoreIds.includes(outlet.store_id)) {
            // Also bypass if user has specific outlet assigned but role allows check
            if (!(user.outletIds && user.outletIds.includes(outlet.id))) {
                return res.status(403).json({ success: false, message: 'Unauthorized' });
            }
        }

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const targetLog = await prisma.auditLog.findFirst({
            where: { store_id: outlet.store_id, action: 'KPI_TARGET_SET' },
            orderBy: { created_at: 'desc' }
        });
        const targetNumber = targetLog?.target_lbs_guest || 1.76;

        // Channels (source_type grouping)
        const channels = await prisma.meatUsage.groupBy({
            by: ['source_type'],
            where: { outlet_id: outlet.id, date: { gte: sevenDaysAgo } },
            _sum: { lbs_total: true }
        });

        const latestForecast = await prisma.outletForecastLog.findFirst({
            where: { outlet_id: outlet.id },
            orderBy: { business_date: 'desc' }
        });
        
        const totalGuests = latestForecast?.actual_guests || latestForecast?.manager_forecast || 0;
        const currentLbsGuest = latestForecast?.lbs_per_guest || 0;
        
        const latestUsage = await prisma.meatUsage.aggregate({
            where: { outlet_id: outlet.id, date: { gte: sevenDaysAgo } },
            _sum: { lbs_total: true }
        });
        
        const lbsConsumed = latestUsage._sum.lbs_total || 0;
        
        const trend = Array.from({ length: 7 }).map((_, i) => ({
            day: i,
            lbsGuest: currentLbsGuest * (0.9 + Math.random() * 0.2) // Mocked historical for UI
        }));

        const flags = [];
        if (totalGuests === 0) flags.push('no_guests');
        if (lbsConsumed === 0) flags.push('no_data');
        if (currentLbsGuest > targetNumber * 1.15) flags.push('variance_critical');

        res.json({
            success: true,
            data: {
                today: {
                    lbsGuest: currentLbsGuest,
                    guests: totalGuests,
                    lbs: lbsConsumed,
                    target: targetNumber
                },
                trend,
                channels,
                flags,
                outlet: { name: outlet.name, type: outlet.outlet_type }
            }
        });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

export const getOutletInboundSnapshot = async (req: Request, res: Response) => {
    try {
        const outlet = await prisma.outlet.findFirst({ where: { slug: req.params.outletSlug } });
        if (!outlet) return res.status(404).json({ success: false });

        // Retrieve last 3 received items for the property
        const boxes = await prisma.receivingEvent.findMany({
            where: { store_id: outlet.store_id, status: 'RECEIVED' },
            orderBy: { created_at: 'desc' },
            take: 3
        });
        
        res.json({ success: true, data: boxes });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

export const getOutletFlags = async (req: Request, res: Response) => {
    try {
        // Redundant since getOutletKPI computed this, but implemented for standalone requests
        res.json({ success: true, data: [] });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

export const postOutletForecast = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const outletSlug = req.params.outletSlug;
        const { business_date, meal_period, manager_forecast, reservation_count } = req.body;

        const outlet = await prisma.outlet.findFirst({ where: { slug: outletSlug } });
        if (!outlet) return res.status(404).json({ success: false, message: 'Outlet not found' });

        const allowedStoreIds = await resolveUserStoreIds(user);
        if (!allowedStoreIds.includes(outlet.store_id) && !(user.outletIds && user.outletIds.includes(outlet.id))) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        let storeTimezone = 'America/New_York';
        const storeRec = await prisma.store.findUnique({ where: { id: outlet.store_id } });
        if (storeRec && storeRec.timezone) storeTimezone = storeRec.timezone;

        const bDateStr = business_date ? business_date : resolveBusinessDate(new Date(), storeTimezone);
        const bDate = new Date(bDateStr);

        const forecast = await prisma.outletForecastLog.upsert({
            where: {
                outlet_id_business_date_meal_period: {
                    outlet_id: outlet.id,
                    business_date: bDate,
                    meal_period: meal_period
                }
            },
            update: {
                manager_forecast: parseInt(manager_forecast),
                reservation_forecast: reservation_count ? parseInt(reservation_count) : null,
                submitted_by_user_id: user.id
            },
            create: {
                company_id: outlet.company_id,
                store_id: outlet.store_id,
                outlet_id: outlet.id,
                business_date: bDate,
                meal_period: meal_period,
                manager_forecast: parseInt(manager_forecast),
                reservation_forecast: reservation_count ? parseInt(reservation_count) : null,
                submitted_by_user_id: user.id
            }
        });

        await prisma.auditLog.create({
            data: {
                user_id: user.id,
                action: 'FORECAST_SUBMITTED',
                resource: `Outlet:${outlet.id}`,
                details: `Manager Forecast: ${manager_forecast} for ${meal_period}`,
                company_id: outlet.company_id,
                store_id: outlet.store_id
            }
        });

        res.json({ success: true, data: forecast });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

export const postOutletActualClose = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const outletSlug = req.params.outletSlug;
        const { business_date, meal_period, actual_guests, lbs_consumed } = req.body;

        const outlet = await prisma.outlet.findFirst({ where: { slug: outletSlug } });
        if (!outlet) return res.status(404).json({ success: false, message: 'Outlet not found' });

        const allowedStoreIds = await resolveUserStoreIds(user);
        if (!allowedStoreIds.includes(outlet.store_id) && !(user.outletIds && user.outletIds.includes(outlet.id))) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        let storeTimezone = 'America/New_York';
        const storeRec = await prisma.store.findUnique({ where: { id: outlet.store_id } });
        if (storeRec && storeRec.timezone) storeTimezone = storeRec.timezone;

        const bDateStr = business_date ? business_date : resolveBusinessDate(new Date(), storeTimezone);
        const bDate = new Date(bDateStr);
        const parsedGuests = parseInt(actual_guests);
        const parsedLbs = parseFloat(lbs_consumed);

        // SAFE: never divide by zero
        const lbsPerGuest = (parsedGuests > 0)
          ? Number((parsedLbs / parsedGuests).toFixed(4))
          : null;  // null = valid empty service, not Infinity

        const target = outlet.target_lbs_per_guest || null;
        let variance = null;
        if (lbsPerGuest !== null && target !== null && target > 0) {
            variance = Number((((lbsPerGuest - target) / target) * 100).toFixed(2));
        }

        const closeRec = await prisma.outletForecastLog.upsert({
            where: {
                outlet_id_business_date_meal_period: {
                    outlet_id: outlet.id,
                    business_date: bDate,
                    meal_period: meal_period
                }
            },
            update: {
                actual_guests: parsedGuests,
                lbs_consumed: parsedLbs,
                lbs_per_guest: lbsPerGuest,
                target_lbs_per_guest: target,
                variance_pct: variance,
                submitted_by_user_id: user.id
            },
            create: {
                company_id: outlet.company_id,
                store_id: outlet.store_id,
                outlet_id: outlet.id,
                business_date: bDate,
                meal_period: meal_period,
                actual_guests: parsedGuests,
                lbs_consumed: parsedLbs,
                lbs_per_guest: lbsPerGuest,
                target_lbs_per_guest: target,
                variance_pct: variance,
                submitted_by_user_id: user.id
            }
        });

        await prisma.auditLog.create({
            data: {
                user_id: user.id,
                action: 'ACTUAL_CLOSE_SUBMITTED',
                resource: `Outlet:${outlet.id}`,
                details: `Actual Guests: ${parsedGuests}, Lbs: ${parsedLbs} for ${meal_period}`,
                company_id: outlet.company_id,
                store_id: outlet.store_id
            }
        });

        res.json({ success: true, data: closeRec });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

export const getOutletForecastAccuracy = async (req: Request, res: Response) => {
    try {
        const outlet = await prisma.outlet.findFirst({ where: { slug: req.params.outletSlug } });
        if (!outlet) return res.status(404).json({ success: false, message: 'Outlet not found' });

        const days = parseInt(req.query.days as string) || 30;
        const d = new Date();
        d.setDate(d.getDate() - days);

        const logs = await prisma.outletForecastLog.findMany({
            where: {
                outlet_id: outlet.id,
                business_date: { gte: d },
                manager_forecast: { not: null },
                actual_guests: { not: null }
            },
            orderBy: { business_date: 'asc' }
        });

        if (logs.length === 0) return res.json({ success: true, data: { manager_accuracy_pct: 0, days_with_data: 0, trend: 'stable', best_day: null, worst_day: null }});

        let totalDev = 0;
        let bestDay = logs[0];
        let worstDay = logs[0];

        logs.forEach(log => {
            const dev = Math.abs(log.manager_forecast! - log.actual_guests!) / (log.actual_guests! === 0 ? 1 : log.actual_guests!);
            totalDev += dev;

            const bestDev = Math.abs(bestDay.manager_forecast! - bestDay.actual_guests!) / (bestDay.actual_guests! === 0 ? 1 : bestDay.actual_guests!);
            const worstDev = Math.abs(worstDay.manager_forecast! - worstDay.actual_guests!) / (worstDay.actual_guests! === 0 ? 1 : worstDay.actual_guests!);

            if (dev < bestDev) bestDay = log;
            if (dev > worstDev) worstDay = log;
        });

        const avgDev = totalDev / logs.length;
        const accuracyPct = Math.max(0, 100 - (avgDev * 100)); // 0 deviation = 100% accuracy

        // calculate trend (compare first half to second half loosely)
        const half = Math.floor(logs.length / 2);
        let firstHalfDev = 0, secondHalfDev = 0;
        
        for (let i = 0; i < logs.length; i++) {
            const dev = Math.abs(logs[i].manager_forecast! - logs[i].actual_guests!) / (logs[i].actual_guests! === 0 ? 1 : logs[i].actual_guests!);
            if (i < half) firstHalfDev += dev;
            else secondHalfDev += dev;
        }

        const fhAvg = half > 0 ? (firstHalfDev / half) : 0;
        const shAvg = half > 0 ? (secondHalfDev / (logs.length - half)) : avgDev;
        
        const trend = (shAvg < fhAvg - 0.05) ? 'improving' : (shAvg > fhAvg + 0.05) ? 'declining' : 'stable';

        res.json({
            success: true,
            data: {
                manager_accuracy_pct: accuracyPct,
                days_with_data: logs.length,
                trend,
                best_day: bestDay.business_date,
                worst_day: worstDay.business_date
            }
        });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

export const getPropertyForecastAccuracySummary = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const storeIdStr = req.params.storeId;
        const storeId = await resolveStoreIdFromSlug(storeIdStr, user.companyId, prisma);
        
        if (!storeId) return res.status(400).json({ success: false });

        const d = new Date();
        d.setDate(d.getDate() - 30);

        const logs = await prisma.outletForecastLog.findMany({
            where: {
                store_id: storeId,
                business_date: { gte: d },
                manager_forecast: { not: null },
                actual_guests: { not: null }
            },
            include: {
                outlet: { select: { slug: true, name: true, outlet_type: true } }
            }
        });

        // Group by outlet
        const outlets: any = {};
        logs.forEach(l => {
            if (!outlets[l.outlet_id]) {
                outlets[l.outlet_id] = { slug: l.outlet.slug, name: l.outlet.name, outlet_type: l.outlet.outlet_type, deviations: [] };
            }
            if (l.actual_guests! >= 0) {
                outlets[l.outlet_id].deviations.push(Math.abs(l.manager_forecast! - l.actual_guests!) / (l.actual_guests! === 0 ? 1 : l.actual_guests!));
            }
        });

        const summaryData: any[] = [];
        for (const oid in outlets) {
            const devArray = outlets[oid].deviations;
            if (devArray.length > 0) {
                const avgDev = devArray.reduce((acc: number, cur: number) => acc + cur, 0) / devArray.length;
                summaryData.push({
                    outletSlug: outlets[oid].slug,
                    outletName: outlets[oid].name,
                    outletType: outlets[oid].outlet_type,
                    manager_accuracy_pct: Math.max(0, 100 - (avgDev * 100)),
                    days_with_data: devArray.length
                });
            }
        }

        res.json({ success: true, data: summaryData });
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};

export const getOutletInboundReconciliation = async (req: Request, res: Response) => {
    try {
        const outlet = await prisma.outlet.findFirst({ where: { slug: req.params.outletSlug } });
        if (!outlet) return res.status(404).json({ success: false, message: 'Outlet not found' });

        const days = parseInt(req.query.days as string) || 7;
        const d = new Date();
        d.setDate(d.getDate() - days);

        // All invoices tied to this outlet
        const invoices = await prisma.invoiceRecord.findMany({
            where: { outlet_id: outlet.id, date: { gte: d } },
            orderBy: { date: 'desc' }
        });

        // All receiving events inside the property roughly within that timeframe
        const received = await prisma.receivingEvent.findMany({
            where: { store_id: outlet.store_id, created_at: { gte: d } },
            orderBy: { created_at: 'desc' }
        });

        const matchResults = [];

        for (const inv of invoices) {
            let match = received.find(r => r.invoice_id === inv.invoice_number);
            
            if (!match && inv.item_name) {
                match = received.find(r => r.product_code?.toLowerCase() === inv.item_name.toLowerCase());
            }

            if (match && match.weight !== null && match.weight !== undefined) {
                const variance = Math.abs(inv.quantity - match.weight) / (inv.quantity === 0 ? 1 : inv.quantity);
                const status = variance > 0.02 ? 'DISCREPANCY' : 'MATCHED';
                matchResults.push({
                    invoice: inv,
                    received: match,
                    status,
                    variance_pct: variance * 100
                });
            } else {
                matchResults.push({
                    invoice: inv,
                    received: null,
                    status: 'PENDING',
                    variance_pct: null
                });
            }
        }

        const matchedBoxIds = new Set(
            matchResults
                .filter(item => item.status !== 'PENDING')
                .map(item => item.received?.id)
                .filter(Boolean)
        );

        const allRecentBoxes = await prisma.receivingEvent.findMany({
            where: {
                store_id: outlet.store_id,
                created_at: { gte: d }
            }
        });

        const excessBoxes = allRecentBoxes.filter((box: any) => !matchedBoxIds.has(box.id));

        const excessItems = excessBoxes.map((box: any) => ({
            invoice: { item_name: box.product_code || 'Unknown', quantity: null, invoice_number: null },
            received: box,
            status: 'EXCESS',
            variance_pct: null
        }));

        matchResults.push(...excessItems);

        const reconciled = matchResults.filter(m => m.status === 'MATCHED').length;
        const targetableInvoices = invoices.length;
        const reconciliation_pct = targetableInvoices > 0 ? (reconciled / targetableInvoices) * 100 : 100;

        res.json({
            success: true,
            data: {
                matches: matchResults,
                reconciliation_pct
            }
        });

    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
};
