import { Router } from 'express';
import { SREController } from '../controllers/SREController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Endpoint for SRE Debug / Railway Drift Analysis
router.get('/diagnostics', requireAuth as any, SREController.diagnostics);

// Administrative Engine
router.post('/tenants/delete/dry-run', requireAuth as any, SREController.dryRun);
router.post('/tenants/delete/execute', requireAuth as any, SREController.execute);

export default router;
