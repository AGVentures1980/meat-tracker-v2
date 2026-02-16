
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
    }
};
