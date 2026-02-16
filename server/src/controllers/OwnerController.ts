import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const OwnerController = {
    async setupOwnerCompanies(req: Request, res: Response) {
        try {
            const directorEmail = 'dallas@texasdebrazil.com';
            const user = await prisma.user.findUnique({ where: { email: directorEmail } });

            if (!user) {
                return res.status(404).json({ error: 'Director user not found' });
            }

            // 1. Link existing "Brasa Group" to this owner
            await prisma.company.updateMany({
                where: { id: 'CMP-001' },
                data: { owner_id: user.id }
            });

            // 2. Create Mockup Company: Brasa Burger Hub
            const burgerCompanyId = 'CMP-MOCK-002';
            const burgerCompany = await prisma.company.upsert({
                where: { id: burgerCompanyId },
                update: {},
                create: {
                    id: burgerCompanyId,
                    name: 'Brasa Burger Hub',
                    owner_id: user.id,
                    plan: 'growth'
                }
            });

            // 3. Create Stores for Burger Hub
            const burgerStores = [
                { id: 10, name: 'Downtown Burger Haus', location: 'Main St.' },
                { id: 11, name: 'Coastal Grill & Bun', location: 'Beachway Blvd' }
            ];

            for (const s of burgerStores) {
                const store = await prisma.store.upsert({
                    where: { id: s.id },
                    update: {},
                    create: {
                        id: s.id,
                        store_name: s.name,
                        location: s.location,
                        company_id: burgerCompanyId,
                        target_cost_guest: 5.50,
                        target_lbs_guest: 0.85
                    }
                });

                // 4. Seed Burger Targets
                const burgerTargets = [
                    { protein: 'Beef Patty (Pure)', target: 0.45 },
                    { protein: 'Chicken Breast (Fried)', target: 0.15 },
                    { protein: 'Plant-Based Patty', target: 0.10 },
                    { protein: 'Bacon Strips', target: 0.05 },
                    { protein: 'Artisanal Buns', target: 0.15 },
                    { protein: 'House Sauce (Lbs)', target: 0.10 }
                ];

                for (const t of burgerTargets) {
                    await prisma.storeMeatTarget.upsert({
                        where: {
                            store_id_protein: {
                                store_id: s.id,
                                protein: t.protein
                            }
                        },
                        update: {},
                        create: {
                            store_id: s.id,
                            protein: t.protein,
                            target: t.target
                        }
                    });
                }
            }

            return res.json({
                success: true,
                message: 'Owner structure and Brasa Burger Hub mockup seeded successfully.',
                companies: [
                    { id: 'CMP-001', name: 'Brasa Group' },
                    { id: burgerCompanyId, name: 'Brasa Burger Hub' }
                ]
            });
        } catch (error: any) {
            console.error('Owner Setup Failed:', error);
            return res.status(500).json({ error: error.message });
        }
    },

    async getMyCompanies(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const companies = await prisma.company.findMany({
                where: { owner_id: user.id },
                include: {
                    _count: {
                        select: { stores: true }
                    }
                }
            });

            return res.json({ success: true, companies });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }
};
