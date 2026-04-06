import { Router } from 'express';
import { YieldController } from '../controllers/YieldController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
const yieldController = new YieldController();

// A La Carte Specific Routes
router.post('/:storeId/log', requireAuth, yieldController.logYield);
router.post('/:storeId/audit-portion', requireAuth, yieldController.auditPortion);
router.post('/:storeId/ghost-math', requireAuth, yieldController.saveGhostMathAudit);

// Quarantine / Supply Chain Routes
router.get('/quarantine-queue', requireAuth, yieldController.getQuarantineQueue);
router.post('/quarantine/:id/resolve', requireAuth, yieldController.resolveQuarantine);

export default router;
