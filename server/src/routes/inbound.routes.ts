import { Router } from 'express';
import { InboundController } from '../controllers/InboundController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/available', InboundController.getAvailableShipments);
router.post('/create-from-invoice', InboundController.createFromInvoice);
router.post('/receive-weight', requireAuth, require('../../controllers/inboundReconciliationController').receiveWeight);

export default router;
