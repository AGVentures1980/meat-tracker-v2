import { Router } from 'express';
import { SREController } from '../controllers/SREController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Strict SRE/Admin protection should be placed here.
// For now, using standard `authenticate` but checking roles inside or assuming proxy protects this route.

router.post('/tenants/delete/dry-run', requireAuth as any, SREController.dryRun);
router.post('/tenants/delete/execute', requireAuth as any, SREController.execute);

export default router;
