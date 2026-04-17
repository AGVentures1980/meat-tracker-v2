import { Router } from 'express';
import { ReceivingEngineController } from '../controllers/ReceivingEngineController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.post('/scan', ReceivingEngineController.scanWithConcurrencyLock);
router.post('/confirm', ReceivingEngineController.confirmReview);
router.post('/override', ReceivingEngineController.overrideMatch);

export default router;
