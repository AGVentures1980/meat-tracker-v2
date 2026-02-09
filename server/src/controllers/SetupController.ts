import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const SetupController = {
    async runDemoSetup(req: Request, res: Response) {
        try {
            console.log('🎭 Setting up Demo Playground via API...\n');

            // 1. Create Demo Company
            const demoCompany = await prisma.company.upsert({
                where: { id: 'demo-playground-agv' },
                update: {},
                create: {
                    id: 'demo-playground-agv',
                    name: 'AGV Demo Playground',
                    plan: 'trial'
                }
            });

            // 2. Create Demo Stores
            const demoStores = [
                { name: 'Demo - North Dallas', location: 'Dallas, TX', target_lbs_guest: 1.76, target_cost_guest: 9.94 },
                { name: 'Demo - Miami Beach', location: 'Miami, FL', target_lbs_guest: 1.80, target_cost_guest: 10.20 },
                { name: 'Demo - Manhattan', location: 'New York, NY', target_lbs_guest: 1.72, target_cost_guest: 9.50 },
            ];

            const createdStores = [];

            for (const storeData of demoStores) {
                const store = await prisma.store.upsert({
                    where: {
                        company_id_store_name: {
                            company_id: demoCompany.id,
                            store_name: storeData.name
                        }
                    },
                    update: {},
                    create: {
                        company_id: demoCompany.id,
                        store_name: storeData.name,
                        location: storeData.location,
                        target_lbs_guest: storeData.target_lbs_guest,
                        target_cost_guest: storeData.target_cost_guest
                    }
                });

                createdStores.push(store.store_name);

                // 3. Generate Synthetic Meat Usage Data (Last 4 weeks)
                const proteins = ['Picanha', 'Fraldinha', 'Alcatra', 'Cordeiro', 'Linguica'];
                const today = new Date();

                for (let week = 0; week < 4; week++) {
                    const weekDate = new Date(today);
                    weekDate.setDate(today.getDate() - (week * 7));

                    for (const protein of proteins) {
                        const randomLbs = Math.random() * 200 + 100; // 100-300 lbs

                        await prisma.meatUsage.upsert({
                            where: {
                                store_id_protein_date: {
                                    store_id: store.id,
                                    protein,
                                    date: weekDate
                                }
                            },
                            update: {},
                            create: {
                                store_id: store.id,
                                protein,
                                lbs_total: parseFloat(randomLbs.toFixed(2)),
                                date: weekDate
                            }
                        });
                    }
                }
            }

            return res.json({
                success: true,
                message: 'Demo Playground Setup Complete!',
                company: demoCompany.name,
                stores: createdStores
            });

        } catch (error) {
            console.error('Error in SetupController:', error);
            return res.status(500).json({ error: 'Failed to run setup', details: error });
            // Don't disconnect prisma here, let the app handle it
        }
    }
};
