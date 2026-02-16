import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const SetupController = {
    async runDemoSetup(req: Request, res: Response) {
        // ... existing code ...
    },

    async seedTargets(req: Request, res: Response) {
        try {
            console.log('🌱 Seeding Targets via API for ALL stores...');

            // 1. Ensure Default Store (if DB is empty)
            const companyId = 'CMP-001';
            await prisma.company.upsert({
                where: { id: companyId },
                update: {},
                create: { id: companyId, name: 'Brasa Group' }
            });

            await prisma.store.upsert({
                where: { id: 1 },
                update: {},
                create: {
                    id: 1,
                    store_name: 'Brasa Store #1',
                    company_id: companyId,
                    location: 'Default Location'
                }
            });

            // 2. Fetch ALL Stores
            const allStores = await prisma.store.findMany();
            console.log(`Found ${allStores.length} stores to seed.`);

            const defaultTargets = [
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

            let totalCreated = 0;

            for (const store of allStores) {
                for (const t of defaultTargets) {
                    // Check if target exists to avoid duplicates
                    const exists = await prisma.storeMeatTarget.findFirst({
                        where: {
                            store_id: store.id,
                            protein: t.protein
                        }
                    });

                    if (!exists) {
                        await prisma.storeMeatTarget.create({
                            data: {
                                store_id: store.id,
                                protein: t.protein,
                                target: t.target
                            }
                        });
                        totalCreated++;
                    }
                }
            }

            return res.json({
                success: true,
                message: `Seeding Complete. Added ${totalCreated} targets across ${allStores.length} stores.`
            });

        } catch (error) {
            console.error('Seeding Failed:', error);
            return res.status(500).json({ success: false, error: 'Seeding Failed' });
        }
    }
};
