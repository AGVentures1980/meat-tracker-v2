import { Router } from 'express';
import { YieldController } from '../controllers/YieldController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
const yieldController = new YieldController();

// A La Carte Specific Routes
router.post('/:storeId/log', requireAuth, yieldController.logYield);
router.post('/:storeId/audit-portion', requireAuth, yieldController.auditPortion);
router.post('/:storeId/ghost-math', requireAuth, yieldController.saveGhostMathAudit);

export default router;
