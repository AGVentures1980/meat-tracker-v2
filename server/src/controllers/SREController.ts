import { Request, Response } from 'express';
import { TenantDecommissionPlanner } from '../services/TenantDecommissionPlanner';
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
            const { company_id } = req.body;
            
            if (!company_id) {
                return res.status(400).json({ error: 'company_id is required' });
            }

            const plan = await TenantDecommissionPlanner.createPlan(company_id);
            
            return res.status(200).json({
                message: 'Dry Run Generated via Canonical TenantDecommissionPlanner',
                job_id: plan.runId,
                payload: plan.summary,
                dry_run_hash: plan.planHash,
                status: plan.status,
                blockers: plan.blockers
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
        return res.status(403).json({
            error: 'EXECUTION_BLOCKED_CLI_AUTHORIZATION_REQUIRED',
            message: 'Production tenant decommission requires CLI-authenticated authorization gate. Direct API execution is disabled.'
        });
    }
  // ==========================================
  // CHAOS ENGINEERING ENDPOINTS (TEMPORARY)
  // ==========================================
  
  static async injectChaosSafe(req: Request, res: Response) {
    const { PrismaClient } = require('@prisma/client');
    const fs = require('fs');
    const path = require('path');
    const prisma = new PrismaClient();
    try {
      const migDir = path.join(process.cwd(), 'prisma', 'migrations', '20990101000000_mock_safe');
      if (!fs.existsSync(migDir)) fs.mkdirSync(migDir, { recursive: true });
      fs.writeFileSync(path.join(migDir, 'migration.sql'), '-- Mock Safe Migration\nALTER TABLE "Store" ADD COLUMN "target_cost_guest" DOUBLE PRECISION NOT NULL DEFAULT 9.94;\n');

      await prisma.$executeRaw`
        INSERT INTO _prisma_migrations 
        (id, checksum, bytes_applied, applied_steps_count, logs, migration_name, started_at, finished_at) 
        VALUES (gen_random_uuid()::text, 'checksum_safe', 0, 0, 'mock failure', '20990101000000_mock_safe', NOW(), NULL)
        ON CONFLICT DO NOTHING;
      `;
      // We don't exit so we can see the response, but the next boot will resolve it. We wait 1s then exit to force boot.
      setTimeout(() => process.exit(1), 1000);
      res.status(200).json({ message: "BOMBA SAFE PLANTADA E ARQUIVO GERADO. SERVIDOR REINICIANDO AGORA." });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async injectChaosBlock(req: Request, res: Response) {
    const { PrismaClient } = require('@prisma/client');
    const fs = require('fs');
    const path = require('path');
    const prisma = new PrismaClient();
    try {
      const migDir = path.join(process.cwd(), 'prisma', 'migrations', '20990101000001_mock_block');
      if (!fs.existsSync(migDir)) fs.mkdirSync(migDir, { recursive: true });
      fs.writeFileSync(path.join(migDir, 'migration.sql'), '-- Mock Block Migration\nDROP TABLE "StoreMeatTarget";\n');

      await prisma.$executeRaw`
        INSERT INTO _prisma_migrations 
        (id, checksum, bytes_applied, applied_steps_count, logs, migration_name, started_at, finished_at) 
        VALUES (gen_random_uuid()::text, 'checksum_block', 0, 0, 'mock failure', '20990101000001_mock_block', NOW(), NULL)
        ON CONFLICT DO NOTHING;
      `;
      setTimeout(() => process.exit(1), 1000);
      res.status(200).json({ message: "BOMBA DESTRUCTION PLANTADA E ARQUIVO GERADO. SERVIDOR REINICIANDO AGORA." });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async cleanChaos(req: Request, res: Response) {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    try {
      await prisma.$executeRaw`DELETE FROM _prisma_migrations WHERE migration_name LIKE '2099010100000%';`;
      res.status(200).json({ message: "CAOS LIMPO VÍA BD. Os files em disco serão ignorados sem o registro pending. Boot deve seguir limpo." });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
}
