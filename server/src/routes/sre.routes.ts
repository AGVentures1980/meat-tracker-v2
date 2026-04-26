import { Router, Request, Response, NextFunction } from 'express';
import { SREController } from '../controllers/SREController';
import { SRECommandController } from '../controllers/SRECommandController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

function requireOwner(req: any, res: any, next: NextFunction) {
  if (req.user?.email !== 'alexandre@alexgarciaventures.co') {
    return res.status(403).json({ error: 'OWNER_ONLY' });
  }
  next();
}

// ==========================================
// NEW SRE COMMAND CENTER ENDPOINTS
// ==========================================
router.get('/health', requireAuth as any, requireOwner, SRECommandController.health);
router.get('/issues', requireAuth as any, requireOwner, SRECommandController.issues);
router.get('/tenants', requireAuth as any, requireOwner, SRECommandController.tenants);
router.get('/metrics', requireAuth as any, requireOwner, SRECommandController.metrics);

// ==========================================
// LEGACY / EXISTING SRE ENDPOINTS
// ==========================================
// Endpoint for SRE Debug / Railway Drift Analysis
router.get('/diagnostics', requireAuth as any, SREController.diagnostics);

// Administrative Engine
router.post('/tenants/delete/dry-run', requireAuth as any, SREController.dryRun);

// Chaos Engineering (Temporário)
router.get('/chaos/inject_safe', SREController.injectChaosSafe);
router.get('/chaos/inject_block', SREController.injectChaosBlock);
router.get('/chaos/clean', SREController.cleanChaos);

export default router;
