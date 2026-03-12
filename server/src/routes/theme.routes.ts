import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Final Diagnostic & Fix route for Rodrigo
import bcryptjs from 'bcryptjs';
router.get('/setup/rodrigo-fix-final', async (req: Request, res: Response): Promise<void> => {
    try {
        const email = 'rodrigodavila@texasdebrazil.com';
        const plainPassword = 'TDB2026@';
        
        // 1. Generate hash strictly with bcryptjs (which handles cross-platform perfectly)
        const passwordHash = await bcryptjs.hash(plainPassword, 10);
        
        // 2. Immediately verify before saving
        const verifyInMemory = await bcryptjs.compare(plainPassword, passwordHash);
        
        // 3. Save to database
        const updatedUser = await prisma.user.upsert({
            where: { email },
            update: { password_hash: passwordHash, role: 'director', first_name: 'Rodrigo', last_name: 'Davila', is_primary: true },
            create: { email, password_hash: passwordHash, role: 'director', first_name: 'Rodrigo', last_name: 'Davila', is_primary: true }
        });

        // 4. Read back and verify
        const verifyFromDb = await bcryptjs.compare(plainPassword, updatedUser.password_hash);

        res.json({ 
            step: 'final_fix_applied',
            email: updatedUser.email, 
            memoryOk: verifyInMemory,
            dbOk: verifyFromDb,
            userObject: updatedUser
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/setup/rodrigo-dump', async (req: Request, res: Response): Promise<void> => {
    try {
        const users = await prisma.user.findMany({
            where: { email: { contains: 'rodrigo', mode: 'insensitive' } },
            select: { id: true, email: true, created_at: true, password_hash: true, role: true }
        });
        res.json({ users });
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

// Hotfix for TDB and Director Regions executed in production
router.get('/setup/production-hotfix', async (req: Request, res: Response): Promise<void> => {
    try {
        let outputLog = 'Starting Production Data Hotfix...\n\n';
        const bcrypt = require('bcryptjs');

        // 1. Provision TDB Director Account
        outputLog += 'Provisioning TDB Director (Rodrigo)...\n';
        const email = 'rodrigodavila@texasdebrazil.com';
        const passwordHash = await bcrypt.hash('TDB2026@', 10);
        
        await prisma.user.upsert({
            where: { email },
            update: { password_hash: passwordHash, role: 'director', first_name: 'Rodrigo', last_name: 'Davila', is_primary: true },
            create: { email, password_hash: passwordHash, role: 'director', first_name: 'Rodrigo', last_name: 'Davila', is_primary: true }
        });
        outputLog += '✅ Success: Provisioned Operating Director account.\n\n';

        // 2. Set Director Regions (Neri & Jean)
        outputLog += 'Setting FDC Director Regions...\n';
        const fdc = await prisma.company.findFirst({ where: { name: { contains: 'Fogo' } } });
        if (fdc) {
            await prisma.user.updateMany({ where: { email: 'ngiachini@fogo.com' }, data: { director_region: 'West Coast' } });
            await prisma.user.updateMany({ where: { email: 'jrossi@fogo.com' }, data: { director_region: 'East Coast' } });
            
            const stores = await prisma.store.findMany({ where: { company_id: fdc.id } });
            let updatedRegions = 0;
            for (const store of stores) {
                const isWestCoast = ['CA', 'TX', 'NV', 'WA', 'OR', 'AZ', 'NM', 'CO'].some(s => store.location.includes(s)) ||
                                    ['San ', 'Las Vegas', 'Dallas', 'Houston', 'Austin'].some(s => store.store_name.includes(s));
                const region = isWestCoast ? 'West Coast' : 'East Coast';
                await prisma.store.update({ where: { id: store.id }, data: { region } });
                updatedRegions++;
            }
            outputLog += `✅ Updated ${updatedRegions} FDC stores with Coast Regions.\n\n`;
        }

        // 3. Prune TDB Dummy Stores & Reassign Carlos
        outputLog += 'Pruning TDB Dummy Stores...\n';
        const tdb = await prisma.company.findFirst({ where: { name: { contains: 'Texas' } } });
        if (tdb) {
            const allStores = await prisma.store.findMany({ where: { company_id: tdb.id }, orderBy: { id: 'asc' } });
            const mustKeepNames = ['Tampa', 'Memphis', 'Louis', 'Lexing', 'Dallas'];
            const storesToKeep: any[] = [];
            
            for (const store of allStores) {
                if (mustKeepNames.some(name => store.store_name.includes(name) || store.location.includes(name))) {
                    storesToKeep.push(store);
                }
            }
            
            for (const store of allStores) {
                if (storesToKeep.length >= 55) break;
                if (!storesToKeep.find(s => s.id === store.id)) storesToKeep.push(store);
            }
            
            const storesToDelete = allStores.filter(store => !storesToKeep.find(s => s.id === store.id));
            if (storesToDelete.length > 0) {
                const idsToDelete = storesToDelete.map(s => s.id);
                // Prune relations manually
                await prisma.orderItem.deleteMany({ where: { order: { store_id: { in: idsToDelete } } } });
                await prisma.order.deleteMany({ where: { store_id: { in: idsToDelete } } });
                await prisma.inventoryRecord.deleteMany({ where: { store_id: { in: idsToDelete } } });
                await prisma.purchaseRecord.deleteMany({ where: { store_id: { in: idsToDelete } } });
                await prisma.report.deleteMany({ where: { store_id: { in: idsToDelete } } });
                await prisma.wasteLog.deleteMany({ where: { store_id: { in: idsToDelete } } });
                await prisma.wasteCompliance.deleteMany({ where: { store_id: { in: idsToDelete } } });
                await prisma.prepLog.deleteMany({ where: { store_id: { in: idsToDelete } } });
                await prisma.storeMeatTarget.deleteMany({ where: { store_id: { in: idsToDelete } } });
                await prisma.user.updateMany({ where: { store_id: { in: idsToDelete } }, data: { store_id: null } });
                const deleteResult = await prisma.store.deleteMany({ where: { id: { in: idsToDelete } } });
                outputLog += `✅ Deleted ${deleteResult.count} dummy TDB store records.\n`;
            }

            // Restore Carlos
            const carlos = await prisma.user.findFirst({ where: { email: 'carlosrestrepo@texasdebrazil.com' } });
            if (carlos) {
                await prisma.store.updateMany({ where: { area_manager_id: carlos.id }, data: { area_manager_id: null } });
                let restoredCount = 0;
                for (const name of ['Tampa', 'Memphis', 'Louis', 'Lexing']) {
                    const targetStore = storesToKeep.find(s => s.store_name.includes(name) || s.location.includes(name));
                    if (targetStore) {
                        await prisma.store.update({ where: { id: targetStore.id }, data: { area_manager_id: carlos.id } });
                        restoredCount++;
                    }
                }
                outputLog += `✅ Restored Carlos Restrepo to ${restoredCount} precise stores.\n\n`;
            }
        }

        res.send(`<pre>${outputLog}</pre>`);
    } catch (e: any) {
        res.status(500).send(`[ERROR]: ` + e.message);
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
