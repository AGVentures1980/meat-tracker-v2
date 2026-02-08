
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

            // Security Check: Ensure user belongs to this store (or is admin)
            if (user.role !== 'admin' && user.storeId !== id) {
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

            if (user.role === 'admin') {
                return res.json(stats);
            } else {
                // Filter for the user's store
                const myStore = stats.filter(s => s.id === user.storeId);
                return res.json(myStore);
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

            const stats = await MeatEngine.getCompanyAggregateStats(y, w);
            return res.json(stats);
        } catch (error) {
            console.error('Company Aggregate Error:', error);
            return res.status(500).json({ error: 'Failed to fetch company stats' });
        }
    }

    static async updateStoreTargets(req: Request, res: Response) {
        try {
            const { targets } = req.body; // Expects { storeId: number, target: number }[]

            if (!Array.isArray(targets)) {
                return res.status(400).json({ error: 'Invalid format. Expected array of targets.' });
            }

            const updated = [];
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
}
