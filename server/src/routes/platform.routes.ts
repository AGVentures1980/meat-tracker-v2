// Copyright (c) 2023-2026 AGV VENTURES / Alexandre Garcia. All rights reserved.
// BRASA Meat Intelligence™ — Platform Global Intelligence Routes

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

/**
 * Authorization middleware for platform-level global scope.
 * Zero Trust: Rejects tenant-owned actor contexts (COMPANY, STORE, AREA).
 * Uses server-verified ActorContext scope.type === 'GLOBAL', NOT email matching.
 */
export function requireGlobalScope(req: Request, res: Response, next: Function) {
    const user = (req as any).user;
    if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const scopeType = user.scope?.type || (user.role === 'admin' && !user.companyId ? 'GLOBAL' : 'UNKNOWN');

    if (scopeType !== 'GLOBAL') {
        return res.status(403).json({ error: 'Platform Global Intelligence context requires GLOBAL scope.' });
    }

    next();
}

/**
 * GET /api/v1/platform/global-intelligence
 * Dynamic Tenant Registry endpoint. Returns platform companies, branding, active store counts,
 * mapped coordinate counts, geo pending counts, and store location markers.
 */
router.get('/global-intelligence', requireAuth, requireGlobalScope, async (req: Request, res: Response) => {
    try {
        const companies = await prisma.company.findMany({
            where: {
                company_status: {
                    notIn: ['Archived', 'Decommissioned', 'ARCHIVED', 'DECOMMISSIONED']
                }
            },
            orderBy: {
                name: 'asc'
            },
            select: {
                id: true,
                name: true,
                subdomain: true,
                company_status: true,
                theme_logo_url: true,
                theme_primary_color: true,
                stores: {
                    select: {
                        id: true,
                        store_name: true,
                        city: true,
                        country: true,
                        latitude: true,
                        longitude: true,
                        status: true
                    }
                }
            }
        });

        const result = companies.map(co => {
            const activeStores = co.stores.filter((s: { status: string }) => s.status === 'ACTIVE');
            const mappedStores = activeStores.filter((s: { latitude: number | null; longitude: number | null }) => 
                s.latitude !== null && s.longitude !== null && !isNaN(Number(s.latitude)) && !isNaN(Number(s.longitude))
            );
            
            return {
                id: co.id,
                name: co.name,
                subdomain: co.subdomain,
                logo_url: co.theme_logo_url || null,
                primary_color: co.theme_primary_color || null,
                company_status: co.company_status,
                active_store_count: activeStores.length,
                mapped_store_count: mappedStores.length,
                geo_pending_count: activeStores.length - mappedStores.length,
                stores: activeStores.map((s: { id: number; store_name: string; city: string | null; country: string | null; latitude: number | null; longitude: number | null; status: string }) => ({
                    id: s.id,
                    name: s.store_name,
                    city: s.city || null,
                    country: s.country || null,
                    latitude: s.latitude,
                    longitude: s.longitude,
                    status: s.status
                }))
            };
        });

        return res.json({ companies: result });
    } catch (error: any) {
        console.error('[GLOBAL_INTELLIGENCE_ERROR]', error);
        return res.status(500).json({ error: 'Failed to fetch global intelligence data' });
    }
});

export default router;
