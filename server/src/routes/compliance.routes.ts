import { Router } from 'express';
import { ComplianceController } from '../controllers/ComplianceController';
import { ReceivingController } from '../controllers/ReceivingController';

const router = Router();
const controller = new ComplianceController();

router.post('/specs', controller.createCorporateSpec);
router.get('/specs/:companyId', controller.getCorporateSpecs);
router.delete('/specs/:id', controller.deleteCorporateSpec);

// Receiving Scanner Routes
router.post('/scan', ReceivingController.scanBarcode);
router.post('/map-barcode', ReceivingController.mapBarcode);

export default router;
