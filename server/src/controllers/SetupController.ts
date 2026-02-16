import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const SetupController = {
    async runDemoSetup(req: Request, res: Response) {
        // ... existing code ...
    },

    async seedTargets(req: Request, res: Response) {
        try {
            console.log('🌱 Seeding Targets via API...');
            const storeId = 1; // Default
            const companyId = 'CMP-001';

            // Ensure Company
            await prisma.company.upsert({
                where: { id: companyId },
                update: {},
                create: { id: companyId, name: 'Brasa Group' }
            });

            // Ensure Store
            await prisma.store.upsert({
                where: { id: storeId },
                update: {},
                create: {
                    id: storeId,
                    store_name: 'Brasa Store #1',
                    company_id: companyId,
                    location: 'Default Location'
                }
            });

            const targets = [
                { protein: 'Picanha', target: 0.35 },
                { protein: 'Alcatra', target: 0.25 },
                { protein: 'Fraldinha', target: 0.20 },
                { protein: 'Filet Mignon', target: 0.15 },
                { protein: 'Parmesan Pork', target: 0.10 },
                { protein: 'Chicken Legs', target: 0.12 },
                { protein: 'Sausage', target: 0.15 },
                { protein: 'Lamb Chops', target: 0.08 },
                { protein: 'Beef Ribs', target: 0.10 },
                { protein: 'Pineapple', target: 0.05 },
            ];

            for (const t of targets) {
                await prisma.storeMeatTarget.create({
                    data: {
                        store_id: storeId,
                        protein: t.protein,
                        target: t.target
                    }
                });
            }

            return res.json({ success: true, message: 'Targets Seeded Successfully' });

        } catch (error) {
            console.error('Seeding Failed:', error);
            return res.status(500).json({ success: false, error: 'Seeding Failed' });
        }
    }
};
