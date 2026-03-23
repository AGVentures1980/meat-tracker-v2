import { Router } from 'express';
import { YieldController } from '../controllers/YieldController';
import { AuthMiddleware } from '../middleware/auth.middleware';

const router = Router();
const yieldController = new YieldController();

// A La Carte Specific Routes
router.post('/:storeId/log', AuthMiddleware.verifyToken, yieldController.logYield);
router.post('/:storeId/audit-portion', AuthMiddleware.verifyToken, yieldController.auditPortion);
router.post('/:storeId/ghost-math', AuthMiddleware.verifyToken, yieldController.saveGhostMathAudit);

export default router;
