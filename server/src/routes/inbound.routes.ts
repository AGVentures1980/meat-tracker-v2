import { Router } from 'express';
import { InboundController } from '../controllers/InboundController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/available', InboundController.getAvailableShipments);
router.post('/create-from-invoice', InboundController.createFromInvoice);

export default router;
