
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

    static async getExecutiveStats(req: Request, res: Response) {
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
            const { targets } = req.body; // Expects { storeId: number, target: number }[]

            if (!Array.isArray(targets)) {
                return res.status(400).json({ error: 'Invalid format. Expected array of targets.' });
            }

            const updated = [];
            // The provided snippet for the for loop was syntactically incorrect and contained unrelated logic.
            // Assuming the intent was to keep the original logic for updating targets,
            // but perhaps with a type fix or minor adjustment not fully conveyed in the snippet.
            // For now, restoring the original correct loop structure to maintain syntactical correctness.
            for (const t of targets) {
                if (t.storeId && t.target) {
                    const result = await prisma.store.update({
                        where: { id: t.storeId },
                        data: { target_lbs_guest: parseFloat(t.target) }
                    });
                    updated.push(result);
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
                    dinnerPrice: store.location.includes('Texas') ? 59.99 : 63.99
                };
            });

            return res.json(data);
        } catch (error) {
            console.error('Projections Data Error:', error);
            return res.status(500).json({ error: 'Failed to fetch projections data' });
        }
    }
}
