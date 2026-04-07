import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Final Diagnostic & Fix route for Rodrigo
import bcryptjs from 'bcryptjs';
router.get('/setup/rodrigo-fix-final', async (req: Request, res: Response): Promise<void> => {
    try {
        const emails = ['rodrigodavila@texasdebrazil.com', 'rodrigo.davila@texasdebrazil.com'];
        const plainPassword = 'TDB2026@';
        
        // 1. Bypass dynamic Railway compilation drift. Inject offline-verified hash.
        const passwordHash = '$2b$10$OOB3Es8lqb1a7lsFBl3az.3punWYsRLHwwFHak/T3phBfMFjatA1m';
        
        // 2. Immediately verify before saving
        const verifyInMemory = await bcryptjs.compare(plainPassword, passwordHash);
        
        // 3. Save to BOTH accounts
        const results = [];
        for (const email of emails) {
             const updatedUser = await prisma.user.upsert({
                 where: { email },
                 update: { password_hash: passwordHash, role: 'director', first_name: 'Rodrigo', last_name: 'Davila', is_primary: true },
                 create: { email, password_hash: passwordHash, role: 'director', first_name: 'Rodrigo', last_name: 'Davila', is_primary: true }
             });
             const verifyFromDb = await bcryptjs.compare(plainPassword, updatedUser.password_hash);
             results.push({ email, dbOk: verifyFromDb, dbHash: updatedUser.password_hash });
        }

        res.json({ 
            step: 'final_fix_applied_global',
            memoryOk: verifyInMemory,
            results
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/setup/rodrigo-delete', async (req: Request, res: Response): Promise<void> => {
    try {
        const deleted = await prisma.user.deleteMany({
            where: { email: 'rodrigo.davila@texasdebrazil.com' }
        });
        res.json({ message: `Deleted ${deleted.count} user(s).` });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/setup/dump-user', async (req: Request, res: Response): Promise<void> => {
    try {
        const searchEmail = req.query.email as string || 'rodrigo';
        const users = await prisma.user.findMany({
            where: { email: { contains: searchEmail, mode: 'insensitive' } },
            select: { id: true, email: true, created_at: true, password_hash: true, role: true, store_id: true, is_primary: true }
        });
        res.json({ users });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/setup/carlos-fix', async (req: Request, res: Response): Promise<void> => {
    try {
        const c1 = await prisma.user.updateMany({
            where: { email: { contains: 'carlos', mode: 'insensitive' } },
            data: { role: 'area_manager' }
        });
        const c2 = await prisma.user.updateMany({
            where: { email: { contains: 'csilva', mode: 'insensitive' } },
            data: { role: 'area_manager' }
        });
        res.json({ message: 'Carlos accounts forced to area_manager', updated: c1.count + c2.count });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/setup/fdc-templates', async (req: Request, res: Response): Promise<void> => {
    try {
        const fdc = await prisma.company.findFirst({ where: { name: { contains: 'Fogo', mode: 'insensitive' } } });
        if (!fdc) {
            res.status(404).json({ error: 'FDC not found' });
            return;
        }

        const SYSTEM_TEMPLATES = [
            {
                name: 'Default Template',
                description: 'Standard baseline metrics for normal operating conditions.',
                is_system: true,
                config: {
                    target_lbs_guest: 1.45, target_cost_guest: 12.50,
                    lunch_price: 49.00, dinner_price: 64.00,
                    serves_lamb_chops_rodizio: false,
                    protein_targets: {
                        'Beef Ribs': 0.12, 'Filet Mignon': 0.15, 'Picanha': 0.14,
                        'Fraldinha': 0.13, 'Chicken': 0.07, 'Lamb Chops': 0.05,
                        'Sirloin': 0.08, 'Sausage': 0.04, 'Pork Ribs': 0.06, 'Pork Loin': 0.05
                    }
                }
            },
            {
                name: 'High Volume Weekend',
                description: 'Optimized for high turnover. Increased sirloin/chicken/pork, reduced premium yields.',
                is_system: true,
                config: {
                    target_lbs_guest: 1.50, target_cost_guest: 11.20,
                    lunch_price: 49.00, dinner_price: 64.00,
                    serves_lamb_chops_rodizio: false,
                    protein_targets: {
                        'Beef Ribs': 0.09, 'Filet Mignon': 0.10, 'Picanha': 0.12,
                        'Fraldinha': 0.15, 'Chicken': 0.14, 'Lamb Chops': 0.03,
                        'Sirloin': 0.15, 'Sausage': 0.08, 'Pork Ribs': 0.09, 'Pork Loin': 0.05
                    }
                }
            },
            {
                name: 'Special Event',
                description: 'Valentine\'s Day, NYE, Mother\'s Day. 4x volume, premium mix, tight tolerance.',
                is_system: true,
                config: {
                    target_lbs_guest: 1.55, target_cost_guest: 13.50,
                    lunch_price: 49.00, dinner_price: 64.00,
                    serves_lamb_chops_rodizio: true,
                    protein_targets: {
                        'Beef Ribs': 0.06, 'Filet Mignon': 0.25, 'Picanha': 0.22,
                        'Fraldinha': 0.08, 'Chicken': 0.04, 'Lamb Chops': 0.10,
                        'Sirloin': 0.07, 'Sausage': 0.02, 'Pork Ribs': 0.03, 'Pork Loin': 0.03
                    }
                }
            }
        ];

        let created = 0;
        for (const tmpl of SYSTEM_TEMPLATES) {
            await prisma.storeTemplate.upsert({
                where: { company_id_name: { company_id: fdc.id, name: tmpl.name } },
                update: { description: tmpl.description, config: tmpl.config },
                create: { company_id: fdc.id, ...tmpl }
            });
            created++;
        }

        res.json({ message: `Successfully seeded ${created} templates for Fogo de Chão.`, company_id: fdc.id });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/setup/rodrigo-validate-password', async (req: Request, res: Response): Promise<void> => {
    try {
        const { password } = req.body;
        // Check BOTH emails
        const emails = ['rodrigodavila@texasdebrazil.com', 'rodrigo.davila@texasdebrazil.com'];
        const results = [];
        for (const email of emails) {
           const user = await prisma.user.findFirst({ where: { email } });
           if (user) {
               const valid = await bcryptjs.compare(password, user.password_hash);
               results.push({ email, isValid: valid, dbHash: user.password_hash });
           } else {
               results.push({ email, isValid: false, error: 'Not found' });
           }
        }
        res.json({ providedPassword: password, results });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/setup/david-fix', async (req: Request, res: Response): Promise<void> => {
    try {
        const hash = await bcryptjs.hash('Castro2026@', 10);
        
        // Find TDB tenant
        const tdb = await prisma.company.findFirst({
            where: { name: { contains: 'Texas de Brazil', mode: 'insensitive' } }
        });

        if (!tdb) {
            res.status(404).json({ error: "Texas de Brazil company not found!" });
            return;
        }

        const user = await prisma.user.upsert({
            where: { email: 'davidcastro@texasdebrazil.com' },
            update: { password_hash: hash, first_name: 'David', last_name: 'Castro', role: 'director', is_primary: true },
            create: {
                email: 'davidcastro@texasdebrazil.com',
                password_hash: hash,
                first_name: 'David',
                last_name: 'Castro',
                role: 'director',
                is_primary: true
            }
        });
        
        res.json({ message: `Successfully created/updated David Castro: ${user.email} under tenant ${tdb.name}` });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

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

router.get('/setup/terra-deploy', async (req: Request, res: Response): Promise<void> => {
    try {
        const { exec } = require('child_process');
        
        let outputLog = 'Initializing Terra Gaucha deployment...\n\n';

        const runCommand = (cmd: string): Promise<string> => {
            return new Promise((resolve, reject) => {
                exec(cmd, { cwd: process.cwd() }, (err: any, stdout: string, stderr: string) => {
                    if (err) resolve(`[ERROR] ${cmd}: ${stderr || err.message}`);
                    else resolve(`[SUCCESS] ${cmd}:\n${stdout}`);
                });
            });
        };

        outputLog += await runCommand('npx ts-node src/scripts/seed_terra_gaucha.ts') + '\n';
        
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
