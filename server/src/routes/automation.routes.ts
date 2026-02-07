import { Router } from 'express';
import { AutomationController, upload } from '../controllers/AutomationController';

const router = Router();

// OCR Endpoint (Multipart File Upload)
router.post('/ocr-invoice', upload.single('invoice'), AutomationController.scanInvoice);

// OLO Sync Endpoint
router.get('/olo-sales', AutomationController.fetchOloSales);

export default router;
