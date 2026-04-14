import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ProspectingAgent } from '../services/ProspectingAgent';
import { getUserId, requireTenant, AuthContextMissingError } from '../utils/authContext';


const prisma = new PrismaClient();

export const OwnerController = {
    async setupOwnerCompanies(req: Request, res: Response) {
        try {
            const directorEmail = 'alexandre@alexgarciaventures.co';
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
                        target_cost_guest: 4.80,
                        target_lbs_guest: 0.72
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
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Owner Setup Failed:', error);
            return res.status(500).json({ error: error.message });
        }
    },

    async getMyCompanies(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const userId = getUserId(user);
            const role = user.role;
            const email = user.email || '';
            const isMaster = email.toLowerCase().includes('alexandre@alexgarciaventures.co');

            let whereClause: any = {};

            if (role !== 'admin' && !isMaster) {
                // Return companies where user is owner OR companies associated with their assigned store/domain
                const conditions: any[] = [{ owner_id: userId }];

                if (user.companyId) {
                    conditions.push({ id: user.companyId });
                }

                if (user.storeId) {
                    const userStore = await prisma.store.findUnique({
                        where: { id: user.storeId },
                        select: { company_id: true }
                    });
                    if (userStore?.company_id) {
                        conditions.push({ id: userStore.company_id });
                    }
                }

                whereClause = { OR: conditions };
            }

            const companies = await prisma.company.findMany({
                where: {
                    ...whereClause
                },
                include: {
                    _count: {
                        select: { stores: true }
                    }
                }
            });

            return res.json({ success: true, companies });
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            return res.status(500).json({ error: error.message });
        }
    },

    async archiveCompany(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            if (user.role !== 'admin') {
                return res.status(403).json({ error: 'Only admins can archive entire organizations.' });
            }

            const { id } = req.params;

            // Ensure company exists
            const company = await prisma.company.findUnique({ where: { id } });
            if (!company) {
                return res.status(404).json({ error: 'Company not found' });
            }

            // Protect the main AGV / Demo companies from accidental deletion
            if (company.id === 'CMP-001' || company.name.includes('Texas de Brazil') || company.name.includes('Fogo de Chão') || company.name.includes('Brasa Group')) {
                return res.status(403).json({ error: 'You cannot archive system-protected master organizations.' });
            }

            // Perform soft delete
            await prisma.company.update({
                where: { id },
                data: { company_status: 'Archived' }
            });

            return res.json({ success: true, message: `Organization ${company.name} successfully archived.` });
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Archive Company Error:', error);
            return res.status(500).json({ error: 'Failed to archive organization.' });
        }
    },

    async sendLeadEmail(req: Request, res: Response) {
        try {
            const { leadId, emailContent } = req.body;
            console.log(`📧 OwnerController: Sending email to lead ${leadId}`);

            // Call the agent service to handle the sending
            const result = await ProspectingAgent.sendCampaignEmail(leadId, emailContent);

            return res.json(result);
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Email Send Error:', error);
            return res.status(500).json({ error: error.message });
        }
    },

    async seedOutbackPilot(req: Request, res: Response) {
        try {
            console.log('🚀 Starting Outback Steakhouse 30-Day Pilot Seeder (API Route)...');

            let outback = await prisma.company.findFirst({
                where: { name: { contains: 'Outback Steakhouse', mode: 'insensitive' } }
            });

            if (!outback) {
                outback = await prisma.company.create({
                    data: {
                        name: 'Outback Steakhouse (Pilot)',
                        operationType: 'ALACARTE',
                        plan: 'enterprise',
                        subdomain: 'outback-pilot'
                    }
                });
            } else {
                await prisma.company.update({
                    where: { id: outback.id },
                    data: { operationType: 'ALACARTE' }
                });
            }

            const outbackProducts = [
                { name: 'Signature Sirloin 6oz', protein_group: 'Sirloin', is_villain: true, standard_target: 6.0 },
                { name: 'Signature Sirloin 8oz', protein_group: 'Sirloin', is_villain: true, standard_target: 8.0 },
                { name: 'Signature Sirloin 11oz', protein_group: 'Sirloin', is_villain: true, standard_target: 11.0 },
                { name: 'Victoria Filet 6oz', protein_group: 'Filet', is_villain: true, standard_target: 6.0 },
                { name: 'Victoria Filet 8oz', protein_group: 'Filet', is_villain: true, standard_target: 8.0 },
                { name: 'Ribeye 10oz', protein_group: 'Ribeye', is_villain: true, standard_target: 10.0 },
                { name: 'Ribeye 13oz', protein_group: 'Ribeye', is_villain: true, standard_target: 13.0 },
                { name: 'Bone-in Ribeye 18oz', protein_group: 'Ribeye', is_villain: false, standard_target: 18.0 },
                { name: 'Melbourne Porterhouse 22oz', protein_group: 'Porterhouse', is_villain: false, standard_target: 22.0 },
                { name: 'Bloomin Onion (Colossal)', protein_group: 'Produce', is_villain: false, standard_target: 1.0 },
                { name: 'Alice Springs Chicken 8oz', protein_group: 'Chicken', is_villain: false, standard_target: 8.0 }
            ];

            for (const prod of outbackProducts) {
                await prisma.companyProduct.upsert({
                    where: {
                        company_id_name: {
                            company_id: outback.id,
                            name: prod.name
                        }
                    },
                    update: {
                        protein_group: prod.protein_group,
                        is_villain: prod.is_villain,
                        standard_target: prod.standard_target
                    },
                    create: {
                        company_id: outback.id,
                        name: prod.name,
                        protein_group: prod.protein_group,
                        is_villain: prod.is_villain,
                        standard_target: prod.standard_target
                    }
                });
            }

            let store = await prisma.store.findFirst({
                where: { store_name: 'Outback - Dallas Pilot', company_id: outback.id }
            });

            if (!store) {
                store = await prisma.store.create({
                    data: {
                        company_id: outback.id,
                        store_name: 'Outback - Dallas Pilot',
                        location: 'Dallas, TX',
                        is_pilot: true,
                        pilot_start_date: new Date(),
                        is_lunch_enabled: true,
                        lunch_start_time: '11:00',
                        lunch_end_time: '16:00',
                        dinner_start_time: '16:00',
                        dinner_end_time: '22:00',
                        baseline_loss_rate: 6.5
                    }
                });
            }

            const jvpEmail = 'jvp.dallas@outback.com';
            const mpEmail = 'mp.dallas1@outback.com';

            await prisma.user.upsert({
                where: { email: jvpEmail },
                update: { role: 'director', director_region: 'Dallas Metro' },
                create: {
                    email: jvpEmail,
                    first_name: 'John',
                    last_name: 'JVP',
                    password_hash: '$2b$10$xyz', // Dummy hash
                    role: 'director',
                    director_region: 'Dallas Metro'
                }
            });

            await prisma.user.upsert({
                where: { email: mpEmail },
                update: { store_id: store.id, role: 'manager' },
                create: {
                    email: mpEmail,
                    first_name: 'Mike',
                    last_name: 'MP',
                    password_hash: '$2b$10$xyz', // Dummy hash
                    role: 'manager',
                    store_id: store.id
                }
            });

            return res.json({ success: true, message: 'Outback Pilot Seeding Complete via API!' });
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Seed outback error:', error);
            return res.status(500).json({ error: error.message });
        }
    },

    async seedAdegaGauchaPilot(req: Request, res: Response) {
        try {
            console.log('🚀 Starting Adega Gaucha Pilot Seeder (API Route)...');

            let adega = await prisma.company.findFirst({
                where: { name: { contains: 'Adega Gaucha', mode: 'insensitive' } }
            });

            if (!adega) {
                adega = await prisma.company.create({
                    data: {
                        name: 'Adega Gaucha (Pilot)',
                        operationType: 'RODIZIO',
                        plan: 'enterprise',
                        subdomain: 'adegagaucha'
                    }
                });
            } else {
                await prisma.company.update({
                    where: { id: adega.id },
                    data: { operationType: 'RODIZIO' }
                });
            }

            const adegaProducts = [
                { name: 'Picanha', protein_group: 'Picanha', is_villain: true, standard_target: 3.5 },
                { name: 'Fraldinha', protein_group: 'Fraldinha', is_villain: true, standard_target: 2.8 },
                { name: 'Alcatra', protein_group: 'Alcatra', is_villain: false, standard_target: 2.5 },
                { name: 'Filet Mignon', protein_group: 'Filet', is_villain: true, standard_target: 1.5 },
                { name: 'Ribeye', protein_group: 'Ribeye', is_villain: false, standard_target: 1.8 },
                { name: 'Costela de Boi', protein_group: 'Beef Ribs', is_villain: true, standard_target: 5.0 },
                { name: 'Cordeiro', protein_group: 'Lamb', is_villain: true, standard_target: 1.2 },
                { name: 'Costela de Porco', protein_group: 'Pork Ribs', is_villain: false, standard_target: 2.0 },
                { name: 'Frango com Bacon', protein_group: 'Chicken', is_villain: false, standard_target: 1.5 }
            ];

            for (const prod of adegaProducts) {
                await prisma.companyProduct.upsert({
                    where: {
                        company_id_name: {
                            company_id: adega.id,
                            name: prod.name
                        }
                    },
                    update: {
                        protein_group: prod.protein_group,
                        is_villain: prod.is_villain,
                        standard_target: prod.standard_target
                    },
                    create: {
                        company_id: adega.id,
                        name: prod.name,
                        protein_group: prod.protein_group,
                        is_villain: prod.is_villain,
                        standard_target: prod.standard_target
                    }
                });
            }

            let store = await prisma.store.findFirst({
                where: { store_name: 'Adega Gaucha - Orlando Pilot', company_id: adega.id }
            });

            if (!store) {
                store = await prisma.store.create({
                    data: {
                        company_id: adega.id,
                        store_name: 'Adega Gaucha - Orlando Pilot',
                        location: 'Orlando, FL',
                        is_pilot: true,
                        pilot_start_date: new Date(),
                        is_lunch_enabled: true,
                        lunch_start_time: '11:00',
                        lunch_end_time: '16:00',
                        dinner_start_time: '16:00',
                        dinner_end_time: '22:00',
                        baseline_loss_rate: 6.5
                    }
                });
            }

            const ceoEmail = 'ricardo@adegagaucha.com';

            await prisma.user.upsert({
                where: { email: ceoEmail },
                update: { role: 'admin', company_id: adega.id },
                create: {
                    email: ceoEmail,
                    first_name: 'Ricardo',
                    last_name: 'Oliveira',
                    password_hash: '$2b$10$xyz', // Dummy hash for now
                    role: 'admin',
                    company_id: adega.id
                }
            });

            return res.json({ success: true, message: 'Adega Gaucha Pilot Seeding Complete via API!' });
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Seed Adega Gaucha error:', error);
            return res.status(500).json({ error: error.message });
        }
    }
};
