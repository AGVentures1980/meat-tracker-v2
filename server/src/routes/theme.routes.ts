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
                theme_logo_url: '/tdb-logo-white.svg',
                theme_bg_url: '/tdb-hero.mp4'
            }
        });
        const fogoUpdate = await prisma.company.updateMany({
            where: { name: 'Fogo de Chão' },
            data: {
                subdomain: 'fogo',
                theme_primary_color: '#A31D21',
                theme_logo_url: '/fdc-logo-pure-white.png',
                theme_bg_url: '/background_fdc.jpg'
            }
        });
        res.json({ message: 'Tenants configured', tdbCount: tdbUpdate.count, fogoCount: fogoUpdate.count });
    } catch (e: any) {
        res.status(500).send(e.message);
    }
});

// Master FDC Prod Sync Route
router.get('/setup/fdc-deploy', async (req: Request, res: Response): Promise<void> => {
    try {
        const { exec } = require('child_process');

        // 1. First ensure the FDC Company exists under the correct production Admin
        let admin = await prisma.user.findFirst({ where: { role: 'admin' } });
        if (!admin) {
            res.status(500).send('No admin user found to link to FDC.');
            return;
        }

        const FDC_COMPANY_ID = '43670635-c205-4b19-99d4-445c7a683730';
        await prisma.company.upsert({
            where: { id: FDC_COMPANY_ID },
            update: { owner_id: admin.id },
            create: { id: FDC_COMPANY_ID, name: 'Fogo de Chão', owner_id: admin.id, plan: 'enterprise', subdomain: 'fogo' }
        });

        // 2. Execute all the seeders we wrote using npx ts-node (works in Railway's container)
        // Note: Running sequentially to avoid db lockups
        const commands = [
            'npx ts-node seed_fdc_directors.ts',
            'npx ts-node seed_fdc_stores.ts',
            'npx ts-node update_fdc_cuts_and_bar.ts',
            'npx ts-node update_fdc_2025_metrics.ts',
            'npx ts-node seed_fdc_area_managers.ts',
            'npx ts-node update_fdc_theme.ts'
        ];

        let outputLog = 'Linked FDC to Admin ID: ' + admin.id + '\n\n';

        const runCommand = (cmd: string): Promise<string> => {
            return new Promise((resolve, reject) => {
                exec(cmd, { cwd: process.cwd() }, (err: any, stdout: string, stderr: string) => {
                    if (err) resolve(`[ERROR] ${cmd}: ${stderr || err.message}`);
                    else resolve(`[SUCCESS] ${cmd}:\n${stdout}`);
                });
            });
        };

        for (const cmd of commands) {
            outputLog += await runCommand(cmd) + '\n';
        }

        res.send(`<pre>${outputLog}</pre>`);
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
