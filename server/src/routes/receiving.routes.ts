import { Router } from 'express';
import { ReceivingEngineController } from '../controllers/ReceivingEngineController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.post('/scan', ReceivingEngineController.scanWithConcurrencyLock);
router.post('/confirm', ReceivingEngineController.confirmReview);
router.post('/override', ReceivingEngineController.overrideMatch);

export default router;
