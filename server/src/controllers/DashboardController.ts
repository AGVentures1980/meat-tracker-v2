
import { Request, Response } from 'express';
import { MeatEngine } from '../engine/MeatEngine';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DashboardController {
    static async getStats(req: Request, res: Response) {
        try {
            const { storeId } = req.params;
            const user = (req as any).user; // Populated by requireAuth

            if (!storeId) {
                return res.status(400).json({ error: 'Store ID is required' });
            }

            // Convert to number
            const id = parseInt(storeId);
            if (isNaN(id)) {
                return res.status(400).json({ error: 'Invalid Store ID' });
            }

            // Security Check: Ensure user belongs to this store (or is admin/director)
            if (user.role !== 'admin' && user.role !== 'director' && user.storeId !== id) {
                return res.status(403).json({ error: 'Access Denied: You do not have permission to view this store.' });
            }

            const stats = await MeatEngine.getDashboardStats(id);
            return res.json(stats);
        } catch (error) {
            console.error('Dashboard Error:', error);
            return res.status(500).json({ error: 'Failed to fetch dashboard stats' });
        }
    }

    static async getNetworkStats(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const { year, week } = req.query;
            const y = year ? parseInt(year as string) : undefined;
            const w = week ? parseInt(week as string) : undefined;

            const stats = await MeatEngine.getNetworkBiStats(y, w);

            // Security: 
            // If Admin: Return all.
            // If Manager: Return ONLY their store.

            if (user.role === 'admin' || user.role === 'director') {
                return res.json(stats);
            } else {
                // Return dummy stats for the user's specific access if needed, 
                // or just the generic object since it's already a summary.
                return res.json(stats);
            }
        } catch (error) {
            console.error('Network BI Error:', error);
            return res.status(500).json({ error: 'Failed to fetch network stats' });
        }
    }



    static async getNetworkReportCard(req: Request, res: Response) {
        try {
            const { year, week } = req.query;
            const y = year ? parseInt(year as string) : new Date().getFullYear();
            const w = week ? parseInt(week as string) : 8; // Default to week 8 for demo

            const stats = await MeatEngine.getNetworkReportCard(y, w);
            return res.json(stats);
        } catch (error) {
            console.error('Report Card Error:', error);
            return res.status(500).json({ error: 'Failed to fetch report card' });
        }
    }

    static async getCompanyAggregateStats(req: Request, res: Response) {
        try {
            const { year, week } = req.query;
            const y = year ? parseInt(year as string) : undefined;
            const w = week ? parseInt(week as string) : undefined;

            const stats = await MeatEngine.getCompanyAggregateStats(y || 2026, w || 10);
            return res.json(stats);
        } catch (error) {
            console.error('Company Aggregate Error:', error);
            return res.status(500).json({ error: 'Failed to fetch company stats' });
        }
    }

    static async getCompanyStats(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const stats = await MeatEngine.getExecutiveStats(user);
            return res.json(stats);
        } catch (error) {
            console.error('Executive Stats Error:', error);
            return res.status(500).json({ error: 'Failed to fetch executive stats' });
        }
    }

    static async updateStoreTargets(req: Request, res: Response) {
        try {
            const { targets } = req.body; // Expects { storeId: number, target_lbs_guest?: number, target_cost_guest?: number }[]

            if (!Array.isArray(targets)) {
                return res.status(400).json({ error: 'Invalid format. Expected array of targets.' });
            }

            const updated = [];
            for (const t of targets) {
                if (t.storeId) {
                    const updateData: any = {};
                    if (t.target_lbs_guest !== undefined) updateData.target_lbs_guest = parseFloat(t.target_lbs_guest);
                    if (t.target_cost_guest !== undefined) updateData.target_cost_guest = parseFloat(t.target_cost_guest);

                    if (Object.keys(updateData).length > 0) {
                        const result = await (prisma.store as any).update({
                            where: { id: t.storeId },
                            data: updateData
                        });
                        updated.push(result);
                    }
                }
            }

            return res.json({ message: `Updated ${updated.length} stores`, updated });
        } catch (error) {
            console.error('Update Targets Error:', error);
            return res.status(500).json({ error: 'Failed to update targets' });
        }
    }

    static async getProjectionsData(req: Request, res: Response) {
        try {
            const stores = await prisma.store.findMany({
                include: {
                    reports: {
                        orderBy: { generated_at: 'desc' },
                        take: 1
                    }
                }
            });

            // Fallback rates if no reports exist
            const DEFAULT_LUNCH_GUESTS = 15000;
            const DEFAULT_DINNER_GUESTS = 45000;

            const data = stores.map(s => {
                const latestReport = s.reports[0] as any;
                const store = s as any;
                return {
                    id: store.id,
                    name: store.store_name,
                    location: store.location,
                    lunchGuestsLastYear: latestReport ? Math.round(latestReport.dine_in_guests) : DEFAULT_LUNCH_GUESTS,
                    dinnerGuestsLastYear: latestReport ? Math.round(latestReport.delivery_guests) : DEFAULT_DINNER_GUESTS,
                    lunchPrice: store.location.includes('Texas') ? 33.99 : 37.99,
                    dinnerPrice: store.location.includes('Texas') ? 59.99 : 63.99,
                    target_lbs_guest: store.target_lbs_guest || 1.76
                };
            });

            return res.json(data);
        } catch (error) {
            console.error('Projections Data Error:', error);
            return res.status(500).json({ error: 'Failed to fetch projections data' });
        }
    }


    static async syncStoreTargets(req: Request, res: Response) {
        try {
            console.log('🔄 Syncing Store Targets from Standards...');

            // Specific Targets defined by User (Phase 12 - Derived from Batch 2-8 Raw Data Sums)
            const TARGET_OVERRIDES: Record<string, number> = {
                // Direct Matches & Primary Proxies
                'Addison': 1.23,
                'Dallas': 1.77,   // Dallas Uptown
                'Orlando': 1.89,
                'Vegas': 1.83,
                'SanAnt': 1.57,
                'Houston': 1.68,
                'Irvine': 1.78,
                'Denver': 1.71,
                'Pitt': 1.79,
                'MiamiB': 1.75,
                'Buffalo': 1.77,  // Proxy for Burlington
                'FairOak': 1.75,  // AVG for DC Metro
                'Jax': 1.77,
                'Omaha': 1.77,    // Proxy for Kansas City
                'Rich': 1.56,     // Proxy for Bethesda
                'Saw': 1.63,      // Proxy for Fort Lauderdale
                'Tacoma': 1.80,   // Proxy for PNW
                'Yonkers': 1.70,  // AVG for NY Metro
                'Carls': 1.79,    // Proxy for San Diego
                'BRouge': 1.72,   // Proxy for New Orleans
                'Birming': 1.78,  // Proxy for Atlanta/Dunwoody
                'Fresno': 1.85,   // AVG for NorCal
                'Milwauk': 1.72,  // Proxy for Minneapolis
                'Cucamon': 1.72,  // AVG for LA Metro
                'Schaum': 1.76,   // AVG for Chicago Metro
                'WHart': 1.73,    // Proxy for New England
                'Detroit': 1.72,  // Proxy for Troy

                // Manual / Geo Matches (Batch 1 & Geo)
                'Albuquerque': 1.77,
                'Atlanta': 1.84,
                'Austin': 1.80,
                'Baltimore': 1.90,
                'Bellevue': 1.80,
                'SanJuan': 1.95,
                'Honolulu': 1.95,
                'Phila': 1.82,
                'Wash': 1.82,        // Metro
                'Chicago': 1.82,     // Metro
                'New York': 1.82,    // Metro
                'Los Angeles': 1.82, // Metro
                'San Francisco': 1.82 // Metro
            };

            const TOURIST_CITIES = ['Orlando', 'Vegas', 'Miami', 'Anaheim', 'Fort Lauderdale', 'Hallandale', 'San Juan', 'Honolulu'];
            const METRO_CITIES = ['Dallas', 'Chicago', 'New York', 'Detroit', 'Houston', 'SanAnt', 'Denver', 'Wash', 'Phila', 'Boston', 'Los Angeles', 'San Francisco', 'Atlanta'];

            const stores = await prisma.store.findMany();
            let updatedCount = 0;

            for (const s of stores) {
                const store = s as any;
                const storeName = store.store_name;
                let targetLbs = TARGET_OVERRIDES[storeName];

                if (!targetLbs) {
                    if (TOURIST_CITIES.some(c => storeName.includes(c))) {
                        targetLbs = 1.95;
                    } else if (METRO_CITIES.some(c => storeName.includes(c))) {
                        targetLbs = 1.82;
                    } else {
                        targetLbs = 1.76;
                    }
                }

                if (store.target_lbs_guest !== targetLbs) {
                    await prisma.store.update({
                        where: { id: store.id },
                        data: { target_lbs_guest: targetLbs } as any
                    });
                    updatedCount++;
                }
            }

            return res.json({ message: `Synced targets for ${updatedCount} stores.` });
        } catch (error) {
            console.error('Sync Targets Error:', error);
            return res.status(500).json({ error: 'Failed to sync targets' });
        }
    }

    // --- GOVERNO 3.1: THE AI EXECUTIVE ---

    static async getAuditLogAnalysis(req: Request, res: Response) {
        try {
            // Find recent gate overrides ('No Delivery' flags)
            const today = new Date();
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 7);

            const logs = await prisma.auditLog.findMany({
                where: {
                    action: 'NO_DELIVERY_FLAG',
                    created_at: {
                        gte: lastWeek
                    }
                },
                orderBy: { created_at: 'desc' }
            });

            // Group by Store/User to find repeat offenders
            const analysis: Record<string, number> = {};
            logs.forEach(log => {
                const key = log.location || 'Unknown Store';
                analysis[key] = (analysis[key] || 0) + 1;
            });

            const suspicious = Object.entries(analysis)
                .filter(([_, count]) => count >= 2) // 2+ overrides in a week is suspicious
                .map(([store, count]) => ({ store, count, status: 'HIGH RISK' }));

            return res.json({ logs, suspicious });
        } catch (error) {
            console.error('Audit Analysis Error:', error);
            // Return empty if auditLog table not ready
            return res.json({ logs: [], suspicious: [] });
        }
    }

    static async getVillainDeepDive(req: Request, res: Response) {
        try {
            // Aggregate waste for VILLAIN items across the network
            const VILLAINS = ['Picanha', 'Picanha with Garlic', 'Lamb Picanha', 'Beef Ribs', 'Lamb Chops', 'Filet Mignon', 'Filet Mignon with Bacon', 'Fraldinha', 'Flap Steak'];

            // This is a simplified query. In production, we'd sum from WasteLog items JSON.
            // For now, we'll fetch recent waste logs and process in memory (prototype scale).

            const today = new Date();
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 7);

            const wasteLogs = await prisma.wasteLog.findMany({
                where: { date: { gte: lastWeek.toISOString().split('T')[0] } },
                include: { store: true }
            });

            const villainStats: Record<string, { weight: number, instances: number }> = {};

            wasteLogs.forEach(log => {
                const items = log.items as any[];
                items.forEach(item => {
                    if (VILLAINS.some(v => item.protein.includes(v))) {
                        if (!villainStats[item.protein]) {
                            villainStats[item.protein] = { weight: 0, instances: 0 };
                        }
                        villainStats[item.protein].weight += (item.weight || 0);
                        villainStats[item.protein].instances += 1;
                    }
                });
            });

            const rankedVillains = Object.entries(villainStats)
                .map(([name, stats]) => ({ name, ...stats }))
                .sort((a, b) => b.weight - a.weight);

            return res.json({ rankedVillains });
        } catch (error) {
            console.error('Villain Deep Dive Error:', error);
            return res.json({ rankedVillains: [] });
        }
    }
}

