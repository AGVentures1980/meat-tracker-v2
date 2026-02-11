import { Router } from 'express';
import { DeliveryController } from '../controllers/DeliveryController';
import { requireAuth } from '../middleware/auth.middleware';
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = Router();

router.post('/sync-olo', requireAuth, DeliveryController.syncOlo);
router.post('/process-ticket', requireAuth, upload.single('ticket'), DeliveryController.processTicket);

export default router;
