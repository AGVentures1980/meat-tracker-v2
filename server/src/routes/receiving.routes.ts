import { Router } from 'express';
import { ReceivingEngineController } from '../controllers/ReceivingEngineController';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permissionMiddleware';

const router = Router();
router.use(requireAuth);

router.post('/scan', requirePermission('scan_event'), ReceivingEngineController.scanWithConcurrencyLock);
router.post('/confirm', requirePermission('receiving_confirmation'), ReceivingEngineController.confirmReview);
router.post('/override', requirePermission('override_approval'), ReceivingEngineController.overrideMatch);

export default router;
