import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const submitLead = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, company, store_count, message } = req.body;

        // Basic validation
        if (!name || !email) {
            res.status(400).json({ error: 'Name and email are required fields.' });
            return;
        }

        const newLead = await prisma.lead.create({
            data: {
                name,
                email,
                company: company || null,
                store_count: store_count ? parseInt(store_count, 10) : 1,
                message: message || null,
            }
        });

        res.status(201).json({ 
            message: 'Lead successfully captured.',
            leadId: newLead.id 
        });

    } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                res.status(error.status).json({ error: error.message });
                return;
            }
        console.error('Error capturing lead:', error);
        res.status(500).json({ error: 'Internal server error while processing lead.' });
    }
};

export const getLeads = async (req: Request, res: Response): Promise<void> => {
    try {
        const leads = await prisma.lead.findMany({
            orderBy: { created_at: 'desc' }
        });

        res.status(200).json(leads);
    } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                res.status(error.status).json({ error: error.message });
                return;
            }
        console.error('Error fetching leads:', error);
        res.status(500).json({ error: 'Internal server error while fetching leads.' });
    }
};
