import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SettingsController {
    static async getSettings(req: Request, res: Response) {
        try {
            const settings = await prisma.systemSettings.findMany();
            return res.json(settings);
        } catch (error) {
            console.error('Fetch Settings Error:', error);
            return res.status(500).json({ error: 'Failed to fetch settings' });
        }
    }

    static async updateSettings(req: Request, res: Response) {
        try {
            const { settings } = req.body; // Array of { key: string, value: string, type: string }
            const user = (req as any).user;

            if (!Array.isArray(settings)) {
                return res.status(400).json({ error: 'Invalid format. Expected array.' });
            }

            for (const s of settings) {
                await prisma.systemSettings.upsert({
                    where: { key: s.key },
                    update: { value: s.value, type: s.type },
                    create: { key: s.key, value: s.value, type: s.type }
                });

                // Audit log
                await prisma.auditLog.create({
                    data: {
                        user_id: user.id,
                        action: 'UPDATE_SETTING',
                        resource: s.key,
                        details: { oldValue: '...', newValue: s.value },
                        location: 'System'
                    }
                });
            }

            return res.json({ message: 'Settings updated successfully' });
        } catch (error) {
            console.error('Update Settings Error:', error);
            return res.status(500).json({ error: 'Failed to update settings' });
        }
    }

    // --- Store Management ---

    static async getStores(req: Request, res: Response) {
        try {
            const stores = await prisma.store.findMany({
                orderBy: { store_name: 'asc' },
                include: {
                    users: {
                        where: { role: 'manager' },
                        select: { email: true, role: true }
                    }
                }
            });
            return res.json(stores);
        } catch (error) {
            console.error('Fetch Stores Error:', error);
            return res.status(500).json({ error: 'Failed to fetch stores' });
        }
    }

    static async createStore(req: Request, res: Response) {
        try {
            const { store_name, target_lbs_guest, manager_email, manager_password, location } = req.body;
            const creator = (req as any).user;

            if (!store_name || !target_lbs_guest) {
                return res.status(400).json({ error: 'Store Name and Target are required' });
            }

            // 1. Create Store
            // We need a unique ID. Since our IDs are integers, we need to find the max or use a sequence.
            // But usually autoincrement is best. The schema definition might be manual ID though?
            // Let's check schema/seed. Seed manually assigns IDs. Schema?
            // "id Int @id" usually implies manual unless @default(autoincrement())
            // Let's assume we need to find the max ID + 1 if it's not autoincrement.
            // Checking seed.js: "create: { id: storeId, ..." implies manual.

            const maxStore = await prisma.store.findFirst({ orderBy: { id: 'desc' } });
            const newId = (maxStore?.id || 0) + 1;

            // 2. Transaction
            const result = await prisma.$transaction(async (tx) => {
                // Find TDB Company
                const company = await tx.company.findFirst();
                if (!company) throw new Error("Company not found");

                const store = await tx.store.create({
                    data: {
                        id: newId,
                        company_id: company.id,
                        store_name,
                        location: location || 'USA',
                        target_lbs_guest: parseFloat(target_lbs_guest),
                        target_cost_guest: 9.94 // Default
                    }
                });

                let manager = null;
                if (manager_email && manager_password) {
                    // Check if exists
                    const existingUser = await tx.user.findUnique({ where: { email: manager_email } });
                    if (existingUser) {
                        throw new Error(`User ${manager_email} already exists`);
                    }

                    const bcrypt = require('bcrypt'); // Lazy load
                    const hash = await bcrypt.hash(manager_password, 10);

                    manager = await tx.user.create({
                        data: {
                            email: manager_email,
                            password_hash: hash,
                            role: 'manager',
                            store_id: store.id,
                            force_change: true
                        }
                    });
                }

                // Audit Log
                await tx.auditLog.create({
                    data: {
                        user_id: creator.id,
                        action: 'CREATE_STORE',
                        resource: store.store_name,
                        details: { target: target_lbs_guest, manager: manager_email },
                        location: 'System'
                    }
                });

                // 3. Seed Meat Targets (Distribution based on Standards)
                // This ensures the new store has a baseline for every meat type, scaled to its specific total target.
                const standards = require('../config/standards').MEAT_STANDARDS; // Lazy load or move import up
                const totalTarget = parseFloat(target_lbs_guest);

                for (const [protein, percentage] of Object.entries(standards)) {
                    // standard values like 0.39 are based on ~1.76 total.
                    // We need to re-distribute. 
                    // Actually, MEAT_STANDARDS sums to ~1.76. 
                    // So we should calculate the ratio: (Standard / 1.76) * NewTarget
                    const standardTotal = 1.76;
                    const ratio = (percentage as number) / standardTotal;
                    const specificTarget = ratio * totalTarget;

                    await tx.storeMeatTarget.create({
                        data: {
                            store_id: store.id,
                            protein: protein,
                            target: parseFloat(specificTarget.toFixed(3)),
                            cost_target: 0 // Default, can be updated later
                        }
                    });
                }

                return { store, manager };
            });

            return res.json(result);

        } catch (error: any) {
            console.error('Create Store Error:', error);
            return res.status(500).json({ error: error.message || 'Failed to create store' });
        }
    }

    static async updateStore(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { target_lbs_guest, lunch_price, dinner_price, exclude_lamb_from_rodizio_lbs } = req.body;
            const updater = (req as any).user;

            const updatedStore = await prisma.store.update({
                where: { id: Number(id) },
                data: {
                    target_lbs_guest: parseFloat(target_lbs_guest),
                    lunch_price: parseFloat(lunch_price),
                    dinner_price: parseFloat(dinner_price),
                    exclude_lamb_from_rodizio_lbs: exclude_lamb_from_rodizio_lbs
                }
            });

            // Audit Log
            await prisma.auditLog.create({
                data: {
                    user_id: updater.id,
                    action: 'UPDATE_STORE',
                    resource: updatedStore.store_name,
                    details: { target: target_lbs_guest, lunch: lunch_price, dinner: dinner_price, exclude_lamb: exclude_lamb_from_rodizio_lbs },
                    location: 'System'
                }
            });

            return res.json(updatedStore);
        } catch (error) {
            console.error('Update Store Error:', error);
            return res.status(500).json({ error: 'Failed to update store' });
        }
    }
}
