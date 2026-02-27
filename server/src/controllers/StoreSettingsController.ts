import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class StoreSettingsController {

    /**
     * Fetch settings for a specific store.
     * Restricted to Admins, Directors, and Owners.
     */
    static async getStoreSettings(req: Request, res: Response) {
        try {
            const userRole = req.user?.role;
            if (!['admin', 'director', 'owner'].includes(userRole || '')) {
                return res.status(403).json({ error: 'Access denied. Elevate privileges required to view Store Operations Settings.' });
            }

            const storeId = parseInt(req.params.id);
            if (isNaN(storeId)) {
                return res.status(400).json({ error: 'Invalid store ID' });
            }

            const store = await prisma.store.findUnique({
                where: { id: storeId },
                select: {
                    id: true,
                    store_name: true,
                    company_id: true,
                    is_lunch_enabled: true,
                    lunch_start_time: true,
                    lunch_end_time: true,
                    dinner_start_time: true,
                    dinner_end_time: true,
                    lunch_price: true,
                    dinner_price: true,
                    target_lbs_guest: true,
                    lunch_target_lbs_guest: true,
                    lunch_excluded_proteins: true,
                    serves_lamb_chops_rodizio: true
                }
            });

            if (!store) {
                return res.status(404).json({ error: 'Store not found' });
            }

            return res.json(store);

        } catch (error) {
            console.error('Error fetching store settings:', error);
            res.status(500).json({ error: 'Failed to fetch store settings' });
        }
    }

    /**
     * Update settings for a specific store.
     * Restricted to Admins, Directors, and Owners.
     */
    static async updateStoreSettings(req: Request, res: Response) {
        try {
            const userRole = req.user?.role;
            if (!['admin', 'director', 'owner'].includes(userRole || '')) {
                return res.status(403).json({ error: 'Access denied. Elevate privileges required to modify Store Operations Settings.' });
            }

            const storeId = parseInt(req.params.id);
            if (isNaN(storeId)) {
                return res.status(400).json({ error: 'Invalid store ID' });
            }

            const data = req.body;

            // Only allow updating specific operational fields
            const updateData: any = {};
            if (data.is_lunch_enabled !== undefined) updateData.is_lunch_enabled = data.is_lunch_enabled;
            if (data.lunch_start_time !== undefined) updateData.lunch_start_time = data.lunch_start_time;
            if (data.lunch_end_time !== undefined) updateData.lunch_end_time = data.lunch_end_time;
            if (data.dinner_start_time !== undefined) updateData.dinner_start_time = data.dinner_start_time;
            if (data.dinner_end_time !== undefined) updateData.dinner_end_time = data.dinner_end_time;

            if (data.lunch_price !== undefined) updateData.lunch_price = parseFloat(data.lunch_price);
            if (data.dinner_price !== undefined) updateData.dinner_price = parseFloat(data.dinner_price);
            if (data.target_lbs_guest !== undefined) updateData.target_lbs_guest = parseFloat(data.target_lbs_guest);
            if (data.lunch_target_lbs_guest !== undefined) updateData.lunch_target_lbs_guest = parseFloat(data.lunch_target_lbs_guest);

            if (data.lunch_excluded_proteins !== undefined && Array.isArray(data.lunch_excluded_proteins)) {
                updateData.lunch_excluded_proteins = data.lunch_excluded_proteins;
            }
            if (data.serves_lamb_chops_rodizio !== undefined) updateData.serves_lamb_chops_rodizio = data.serves_lamb_chops_rodizio;

            const updatedStore = await prisma.store.update({
                where: { id: storeId },
                data: updateData
            });

            return res.json({ success: true, store: updatedStore });

        } catch (error) {
            console.error('Error updating store settings:', error);
            res.status(500).json({ error: 'Failed to update store settings' });
        }
    }
}
