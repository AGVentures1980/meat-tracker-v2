import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Temporary route to inject tenant domain config directly into production DB
router.get('/setup/tenants', async (req: Request, res: Response): Promise<void> => {
    try {
        await prisma.company.updateMany({ where: { name: 'Texas de Brazil' }, data: { subdomain: 'tdb' } });
        await prisma.company.updateMany({ where: { name: 'Fogo de Chão' }, data: { subdomain: 'fogo' } });
        res.send('Tenants configured in Production database');
    } catch (e: any) {
        res.status(500).send(e.message);
    }
});

// GET /api/v1/theme/:subdomain
router.get('/:subdomain', async (req: Request, res: Response): Promise<void> => {
    try {
        const { subdomain } = req.params;

        // "www" or empty subdomain usually means the default site.
        if (!subdomain || subdomain === 'www') {
            res.json({
                primary_color: '#cc0000', // Default Brasa Red
                logo_url: null,          // Default Brasa Logo in frontend
                bg_url: null,            // Default Brasa Background
                company_name: 'Brasa Meat Intelligence'
            });
            return;
        }

        const company = await prisma.company.findUnique({
            where: {
                subdomain: subdomain.toLowerCase()
            },
            select: {
                name: true,
                theme_primary_color: true,
                theme_logo_url: true,
                theme_bg_url: true
            }
        });

        if (!company) {
            // Not found - fallback to default
            res.json({
                primary_color: '#cc0000',
                logo_url: null,
                bg_url: null,
                company_name: 'Brasa Meat Intelligence'
            });
            return;
        }

        res.json({
            primary_color: company.theme_primary_color || '#cc0000',
            logo_url: company.theme_logo_url || null,
            bg_url: company.theme_bg_url || null,
            company_name: company.name
        });
        return;

    } catch (error) {
        console.error('[Theme API] Error fetching theme:', error);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
    }
});

export default router;
