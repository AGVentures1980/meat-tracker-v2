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
            const user = (req as any).user;
            let whereClause: any = {
                company_id: user.companyId
            };

            const stores = await prisma.store.findMany({
                where: whereClause,
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
            const { store_name, target_lbs_guest, manager_email, manager_password, location, lunch_price, dinner_price, is_lunch_enabled } = req.body;
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
                const store = await tx.store.create({
                    data: {
                        id: newId,
                        company_id: creator.companyId,
                        store_name,
                        location: location || 'USA',
                        target_lbs_guest: parseFloat(target_lbs_guest),
                        target_cost_guest: 9.94, // Default
                        lunch_price: lunch_price ? parseFloat(lunch_price) : 34.00,
                        dinner_price: dinner_price ? parseFloat(dinner_price) : 54.00,
                        is_lunch_enabled: is_lunch_enabled === true
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
            const { target_lbs_guest, lunch_price, dinner_price, is_lunch_enabled, serves_lamb_chops_rodizio } = req.body;
            const updater = (req as any).user;
            const storeId = Number(id);

            // 0. Verify Ownership
            const store = await prisma.store.findFirst({
                where: { id: storeId, company_id: updater.companyId }
            });

            if (!store) {
                return res.status(403).json({ error: 'Access Denied: Store not found or belongs to another company.' });
            }

            // 1. Update Store Model
            const updatedStore = await prisma.store.update({
                where: { id: storeId },
                data: {
                    target_lbs_guest: parseFloat(target_lbs_guest),
                    lunch_price: parseFloat(lunch_price),
                    dinner_price: parseFloat(dinner_price),
                    is_lunch_enabled: is_lunch_enabled === true,
                    serves_lamb_chops_rodizio: serves_lamb_chops_rodizio === true
                }
            });

            // 2. Recalculate Meat Targets (Redistribution & Dynamic Cost Logic)
            const { MEAT_STANDARDS } = require('../config/standards');
            const totalTarget = parseFloat(target_lbs_guest);

            // Calculate Base Total for Normalization
            let baseTotalLbs = 0;
            const activeProteins: string[] = [];

            for (const [protein, stdVal] of Object.entries(MEAT_STANDARDS)) {
                if (!serves_lamb_chops_rodizio && protein === 'Lamb Chops') {
                    continue; // Skip lambda
                }
                baseTotalLbs += (stdVal as number);
                activeProteins.push(protein);
            }

            // 2a. Fetch Historical Costs from Invoices (Last 90 Days)
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            const invoices = await prisma.invoiceRecord.findMany({
                where: {
                    store_id: storeId,
                    date: { gte: ninetyDaysAgo }
                }
            });

            // Calculate Weighted Average Cost per Protein
            const costMap: Record<string, { totalCost: number, totalLbs: number }> = {};
            invoices.forEach(inv => {
                const key = inv.item_name.toLowerCase().trim();
                if (!costMap[key]) costMap[key] = { totalCost: 0, totalLbs: 0 };
                costMap[key].totalCost += inv.cost_total;
                costMap[key].totalLbs += inv.quantity;
            });

            // Use fallback costs if no invoice data is found to avoid zero targets
            const FALLBACK_COSTS: Record<string, number> = {
                "picanha": 6.50,
                "garlic picanha": 6.50,
                "fraldinha/flank steak": 8.50,
                "tri-tip": 5.50,
                "lamb chops": 12.00,
                "leg of lamb": 8.00,
                "lamb picanha": 10.00,
                "filet mignon": 14.00,
                "filet bacon": 14.50,
                "beef ribs": 4.50,
                "pork ribs": 3.50,
                "pork loin": 2.80,
                "sausage": 3.20,
                "chicken drumstick": 1.50,
                "chicken breast": 2.50,
                "default": 3.50
            };

            const getAvgCost = (proteinName: string) => {
                const key = proteinName.toLowerCase();
                const stat = costMap[key];

                if (stat && stat.totalLbs > 0) {
                    return stat.totalCost / stat.totalLbs;
                }
                return FALLBACK_COSTS[key] || FALLBACK_COSTS['default'];
            };

            let calculatedTargetCostGuest = 0;

            // Distribute & Update
            const transactionops = activeProteins.map(protein => {
                const stdVal = MEAT_STANDARDS[protein];
                const ratio = stdVal / baseTotalLbs; // Normalize to 100% of the active set
                const newSpecificTarget = ratio * totalTarget; // Scale to new total

                const avgCost = getAvgCost(protein);
                const costContribution = newSpecificTarget * avgCost;
                calculatedTargetCostGuest += costContribution;

                return prisma.storeMeatTarget.upsert({
                    where: {
                        store_id_protein: {
                            store_id: storeId,
                            protein: protein
                        }
                    },
                    update: {
                        target: parseFloat(newSpecificTarget.toFixed(3)),
                        cost_target: parseFloat(costContribution.toFixed(3))
                    },
                    create: {
                        store_id: storeId,
                        protein: protein,
                        target: parseFloat(newSpecificTarget.toFixed(3)),
                        cost_target: parseFloat(costContribution.toFixed(3))
                    }
                });
            });

            // If Lamb Chops not served at this store, zero out its target
            if (!serves_lamb_chops_rodizio) {
                transactionops.push(
                    prisma.storeMeatTarget.upsert({
                        where: { store_id_protein: { store_id: storeId, protein: 'Lamb Chops' } },
                        update: { target: 0, cost_target: 0 },
                        create: { store_id: storeId, protein: 'Lamb Chops', target: 0, cost_target: 0 }
                    })
                );
            }

            // Update Store Target Cost
            transactionops.push(
                prisma.store.update({
                    where: { id: storeId },
                    data: { target_cost_guest: parseFloat(calculatedTargetCostGuest.toFixed(2)) }
                }) as any
            );

            await prisma.$transaction(transactionops);

            // Audit Log
            await prisma.auditLog.create({
                data: {
                    user_id: updater.id,
                    action: 'UPDATE_STORE',
                    resource: updatedStore.store_name,
                    details: { target: target_lbs_guest, lunch: lunch_price, dinner: dinner_price, serves_lamb_chops: serves_lamb_chops_rodizio },
                    location: 'System'
                }
            });

            return res.json(updatedStore);
        } catch (error) {
            console.error('Update Store Error:', error);
            return res.status(500).json({ error: 'Failed to update store' });
        }
    }

    static async setNoDeliveryFlag(req: Request, res: Response) {
        try {
            const { storeId, enabled } = req.body;
            const user = (req as any).user;

            // Log action
            await prisma.auditLog.create({
                data: {
                    user_id: user.id,
                    action: enabled ? 'NO_DELIVERY_FLAG_SET' : 'NO_DELIVERY_FLAG_REMOVED',
                    resource: `Store:${storeId}`,
                    location: storeId.toString()
                }
            });

            return res.json({ message: 'Success' });
        } catch (error) {
            console.error('Set No Delivery Flag Error:', error);
            return res.status(500).json({ error: 'Failed to update flag' });
        }
    }

    static async getCompanyProducts(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const companyId = user.companyId || user.company_id;

            if (!companyId) {
                return res.status(400).json({ error: 'Company ID not found in user context' });
            }

            const products = await (prisma as any).companyProduct.findMany({
                where: { company_id: companyId },
                orderBy: { name: 'asc' }
            });

            return res.json(products);
        } catch (error) {
            console.error('Fetch Company Products Error:', error);
            return res.status(500).json({ error: 'Failed to fetch company products' });
        }
    }
}
