import { Router } from 'express';
import { SREController } from '../controllers/SREController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Endpoint for SRE Debug / Railway Drift Analysis
router.get('/diagnostics', requireAuth as any, SREController.diagnostics);

// Administrative Engine
router.post('/tenants/delete/dry-run', requireAuth as any, SREController.dryRun);
  // Chaos Engineering (Temporário)
  router.get('/chaos/inject_safe', SREController.injectChaosSafe);
  router.get('/chaos/inject_block', SREController.injectChaosBlock);
  router.get('/chaos/clean', SREController.cleanChaos);
  
  export default router;
