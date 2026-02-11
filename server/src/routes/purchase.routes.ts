import { Router } from 'express';
import { PurchaseController } from '../controllers/PurchaseController';
import { requireAuth } from '../middleware/auth.middleware';
import multer from 'multer';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.post('/invoice', requireAuth, PurchaseController.addInvoice);
router.get('/weighted-averages', requireAuth, PurchaseController.getWeightedAverages);
router.post('/process-invoice-ocr', requireAuth, upload.single('invoice'), PurchaseController.processInvoiceOCR);

export default router;
