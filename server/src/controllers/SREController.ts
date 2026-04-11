import { Request, Response } from 'express';
import { TenantDeletionEngine } from '../services/TenantDeletionEngine';
import { SREStartupGuard } from '../utils/SREStartupGuard';

export class SREController {
    
    // GET /api/sre/diagnostics
    static async diagnostics(req: Request, res: Response) {
        try {
            const data = await SREStartupGuard.verifyEnvironmentSafety();
            return res.status(200).json(data);
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            return res.status(500).json({ error: error.message });
        }
    }

    // POST /api/sre/tenants/delete/dry-run
    static async dryRun(req: Request, res: Response) {
        try {
            const { company_id, environment } = req.body;
            
            if (!company_id || !environment) {
                return res.status(400).json({ error: 'company_id and environment are required' });
            }

            // Ideally this is retrieved from a verified JWT token of the Root Admin
            const actorEmail = (req as any).user?.email || 'sre_admin_override@brasa.com';
            const actorId = (req as any).user?.id || 'SRE-SYSTEM';

            const result = await TenantDeletionEngine.performDryRun(company_id, actorId, actorEmail, environment);
            
            return res.status(200).json({
                message: 'Dry Run Generated Successfully',
                job_id: result.job.id,
                payload: result.payload,
                dry_run_hash: result.hash
            });
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            return res.status(500).json({ error: error.message });
        }
    }

    // POST /api/sre/tenants/delete/execute
    static async execute(req: Request, res: Response) {
        try {
            const { job_id, dry_run_hash, environment, confirmation_phrase, allow_production_delete } = req.body;
            
            if (!job_id || !dry_run_hash || !environment || !confirmation_phrase) {
                return res.status(400).json({ error: 'Missing required parameters for execution' });
            }

            const EXPECTED_PHRASE = "I UNDERSTAND THIS WILL PERMANENTLY DELETE TENANT DATA";
            if (confirmation_phrase !== EXPECTED_PHRASE) {
                return res.status(403).json({ error: 'INVALID_CONFIRMATION_PHRASE' });
            }

            const result = await TenantDeletionEngine.execute(job_id, dry_run_hash, environment, allow_production_delete || false);
            
            return res.status(200).json({
                message: 'TENANT ABERRATION NEUTRALIZED',
                job: result
            });
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            return res.status(500).json({ error: error.message });
        }
    }
  // ==========================================
  // CHAOS ENGINEERING ENDPOINTS (TEMPORARY)
  // ==========================================
  
  static async injectChaosSafe(req: Request, res: Response) {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    try {
      // Mark 2099 safe mock as failed
      await prisma.$executeRaw`
        INSERT INTO _prisma_migrations 
        (id, checksum, bytes_applied, applied_steps_count, logs, migration_name, started_at, finished_at) 
        VALUES (gen_random_uuid()::text, 'checksum_safe', 0, 0, 'mock failure', '20990101000000_mock_safe', NOW(), NULL);
      `;
      res.status(200).json({ message: "BOMBA SAFE PLANTADA. O GUARD DEVE DETECTAR E AUTO-RESOLVER NO PRÓXIMO BOOT." });
    } catch (e: any) {
      if (e.message.includes('unique constraint')) {
        res.status(200).json({ message: "Bomba SAFE já plantada. Reboot server to test." });
      } else {
        res.status(500).json({ error: e.message });
      }
    }
  }

  static async injectChaosBlock(req: Request, res: Response) {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    try {
      // Mark 2099 block mock as failed
      await prisma.$executeRaw`
        INSERT INTO _prisma_migrations 
        (id, checksum, bytes_applied, applied_steps_count, logs, migration_name, started_at, finished_at) 
        VALUES (gen_random_uuid()::text, 'checksum_block', 0, 0, 'mock failure', '20990101000001_mock_block', NOW(), NULL);
      `;
      res.status(200).json({ message: "BOMBA DESTRUCTION PLANTADA. O GUARD DEVE DAR FATAL BLOCK NO PRÓXIMO BOOT." });
    } catch (e: any) {
      if (e.message.includes('unique constraint')) {
        res.status(200).json({ message: "Bomba DESTRUCTIVE já plantada. Reboot server to test." });
      } else {
        res.status(500).json({ error: e.message });
      }
    }
  }

  static async cleanChaos(req: Request, res: Response) {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    try {
      await prisma.$executeRaw`DELETE FROM _prisma_migrations WHERE migration_name LIKE '2099010100000%';`;
      res.status(200).json({ message: "CAOS LIMPO. BOOT DEVE SEGUIR NORMALMENTE (NO_ACTION)." });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
}
