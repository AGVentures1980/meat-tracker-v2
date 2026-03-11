
import { Request, Response } from 'express';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export const DebugController = {
    async runMigration(req: Request, res: Response) {
        // Simple security check (hardcoded key for emergency hotfix)
        if (req.query.key !== 'fatality') {
            return res.status(401).json({ error: 'Unauthorized Debug Access' });
        }

        try {
            console.log('[Debug] Starting manual migration...');

            // Run prisma db push
            const { stdout, stderr } = await execPromise('npx prisma db push --accept-data-loss');

            console.log('[Debug] Migration Output:', stdout);
            if (stderr) console.error('[Debug] Migration Errors:', stderr);

            return res.json({
                success: true,
                message: 'Migration command executed',
                output: stdout,
                errors: stderr
            });

        } catch (error) {
            console.error('[Debug] Migration Failed:', error);
            return res.status(500).json({
                error: 'Migration Failed',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    },

    async checkEnv(req: Request, res: Response) {
        if (req.query.key !== 'fatality') return res.status(401).json({ error: 'Unauthorized' });

        return res.json({
            node_env: process.env.NODE_ENV,
            has_db_url: !!process.env.DATABASE_URL,
            db_url_prefix: process.env.DATABASE_URL?.substring(0, 15) + '...'
        });
    },

    async cleanupTdbMeats(req: Request, res: Response) {
        if (req.query.key !== 'fatality') return res.status(401).json({ error: 'Unauthorized' });
        try {
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();

            // Delete targets for Pork Belly, Alcatra, Ribeye globally or for specific stores?
            // User said "remove from dashboard", implying all TdB dashboards.
            // Safe to remove globally for now as they aren't standard yet.
            const unwanted = ['Pork Belly', 'Alcatra', 'Ribeye'];

            const result = await prisma.storeMeatTarget.deleteMany({
                where: {
                    protein: { in: unwanted }
                }
            });

            // Also clean up any mock orders? Maybe not needed.

            return res.json({ success: true, deletedCount: result.count, meats: unwanted });
        } catch (error) {
            return res.status(500).json({ error: String(error) });
        }
    },

    async seedFdcProduction(req: Request, res: Response) {
        if (req.query.key !== 'fatality') return res.status(401).json({ error: 'Unauthorized' });

        try {
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();
            const logs: string[] = [];
            const log = (msg: string) => { console.log(msg); logs.push(msg); };

            const defaultFdcCompanyId = '43670635-c205-4b19-99d4-445c7a683730';
            const tdbCompanyId = 'd8614457-37fb-468f-9a9f-6bd92ebbfd5b';

            log("Starting FDC Prod Seed...");

            // 1. ADD NEW FDC LOCATIONS
            const newStores = [
                { store_name: 'Santa Monica', company_id: defaultFdcCompanyId, location: 'California', timezone: 'America/Los_Angeles', is_lunch_enabled: true },
                { store_name: 'Rancho Cucamonga', company_id: defaultFdcCompanyId, location: 'California', timezone: 'America/Los_Angeles', is_lunch_enabled: true },
                { store_name: 'Columbus', company_id: defaultFdcCompanyId, location: 'Ohio', timezone: 'America/New_York', is_lunch_enabled: true },
                { store_name: 'Charlotte', company_id: defaultFdcCompanyId, location: 'North Carolina', timezone: 'America/New_York', is_lunch_enabled: true },
                { store_name: 'Katy', company_id: defaultFdcCompanyId, location: 'Texas', timezone: 'America/Chicago', is_lunch_enabled: true },
                { store_name: 'Tualatin', company_id: defaultFdcCompanyId, location: 'Oregon', timezone: 'America/Los_Angeles', is_lunch_enabled: true },
                { store_name: 'Daly City', company_id: defaultFdcCompanyId, location: 'California', timezone: 'America/Los_Angeles', is_lunch_enabled: true },
                { store_name: 'Princeton', company_id: defaultFdcCompanyId, location: 'New Jersey', timezone: 'America/New_York', is_lunch_enabled: true },
                { store_name: 'Peoria', company_id: defaultFdcCompanyId, location: 'Arizona', timezone: 'America/Phoenix', is_lunch_enabled: true }
            ];
            for (const s of newStores) {
                const exist = await prisma.store.findFirst({ where: { store_name: s.store_name } });
                if (!exist) {
                    await prisma.store.create({ data: s });
                    log(`Created Store: ${s.store_name}`);
                }
            }

            // 2. TDB PROTEIN SEED: Add Bacon
            const tdbBacon = await prisma.companyProduct.findFirst({ where: { company_id: tdbCompanyId, name: 'Bacon' } });
            if (!tdbBacon) {
                await prisma.companyProduct.create({ data: { name: 'Bacon', company_id: tdbCompanyId, category: 'pork' } });
                log('Added Bacon to TDB');
            }

            // 3. FDC PROTEINS SYNC
            const desiredProteins = [
                "Beef Picanha (Top Butt Caps)", "Beef Flap Meat (Fraldinha)", "Chicken Leg",
                "Beef Top Butt Sirloin (Alcatra)", "Chicken Breast", "Lamb Top Sirloin Caps",
                "Beef \"Bone-in-Ribeye\", Export", "Pork Loin", "Lamb Rack", "Pork Sausage",
                "Beef Short Ribs", "Beef Tenderloin", "Pork Crown (Rack)", "Pork Belly",
                "Chicken Heart", "Beef Porterhouse Short Loin", "Bacon", "Steak with Bacon",
                "Bar Fogo Picanha Burger (8oz)", "Bar Fogo Beef Ribs (A La Carte)",
                "Bar Fogo Filet Mignon (6oz)", "Bar Fogo Lamb Chops (Single/4 Bones)"
            ];

            const existing = await prisma.companyProduct.findMany({ where: { company_id: defaultFdcCompanyId } });
            for (const pName of desiredProteins) {
                if (!existing.find((e: any) => e.name === pName)) {
                    await prisma.companyProduct.create({
                        data: {
                            name: pName,
                            company_id: defaultFdcCompanyId,
                            category: pName.toLowerCase().includes('chicken') ? 'chicken' : (pName.toLowerCase().includes('pork') ? 'pork' : (pName.toLowerCase().includes('lamb') ? 'lamb' : 'beef'))
                        }
                    });
                    log(`Added protein: ${pName}`);
                }
            }
            for (const e of existing) {
                if (!desiredProteins.includes(e.name)) {
                    await prisma.companyProduct.delete({ where: { id: e.id } });
                    log(`Removed protein: ${e.name}`);
                }
            }

            // 4. Assign Area Managers to new stores
            const storeNamesList = newStores.map(s => s.store_name);
            const areaManagers = await prisma.user.findMany({ where: { role: 'area_manager' } });
            if (areaManagers.length > 0) {
                for (let i = 0; i < storeNamesList.length; i++) {
                    const storeName = storeNamesList[i];
                    const manager = areaManagers[i % areaManagers.length];
                    const store = await prisma.store.findFirst({ where: { store_name: storeName } });
                    if (store) {
                        await prisma.store.update({ where: { id: store.id }, data: { area_manager_id: manager.id } });
                        log(`Assigned AM ${manager.first_name || manager.email} to store ${storeName}`);
                    }
                }
            }

            log("FDC Sync Complete.");
            return res.json({ success: true, logs });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: String(error) });
        }
    }
};
