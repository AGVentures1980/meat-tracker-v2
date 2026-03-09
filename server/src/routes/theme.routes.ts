import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Temporary route to inject tenant domain config directly into production DB
router.get('/setup/tenants', async (req: Request, res: Response): Promise<void> => {
    try {
        const tdbUpdate = await prisma.company.updateMany({
            where: { name: 'Texas de Brazil' },
            data: {
                subdomain: 'tdb',
                theme_primary_color: '#7e1518',
                theme_logo_url: 'https://upload.wikimedia.org/wikipedia/commons/7/71/Texas_de_Brazil_logo.svg',
                theme_bg_url: '/tdb_bg_premium.png'
            }
        });
        const fogoUpdate = await prisma.company.updateMany({
            where: { name: 'Fogo de Chão' },
            data: {
                subdomain: 'fogo',
                theme_primary_color: '#A31D21',
                theme_logo_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Fogo_de_Ch%C3%A3o_logo.svg/1024px-Fogo_de_Ch%C3%A3o_logo.svg.png',
                theme_bg_url: 'https://images.unsplash.com/photo-1544025162-8111142125bb?q=80&w=1200&auto=format&fit=crop'
            }
        });
        res.json({ message: 'Tenants configured', tdbCount: tdbUpdate.count, fogoCount: fogoUpdate.count });
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
