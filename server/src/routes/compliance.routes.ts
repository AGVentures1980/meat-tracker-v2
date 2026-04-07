import { Router } from 'express';
import { ComplianceController } from '../controllers/ComplianceController';
import { ReceivingController } from '../controllers/ReceivingController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
const controller = new ComplianceController();

router.post('/specs', requireAuth, controller.createCorporateSpec);
router.get('/specs/:companyId', requireAuth, controller.getCorporateSpecs);
router.get('/prevented-attempts/:companyId', requireAuth, controller.getPreventedAttempts);
router.get('/master/fraud-audit', requireAuth, controller.getMasterFraudAudit);
router.post('/master/fraud-audit/bulk-delete', requireAuth, controller.deleteFraudAudits);
router.delete('/specs/:id', requireAuth, controller.deleteCorporateSpec);

// Receiving Scanner Routes
router.post('/scan', requireAuth, ReceivingController.scanBarcode);
router.post('/map-barcode', requireAuth, ReceivingController.mapBarcode);
router.post('/submit-batch', requireAuth, ReceivingController.submitBatch);
router.get('/purge-ai', requireAuth, ReceivingController.purgeAI);
router.get('/raw-specs', ReceivingController.rawSpecs);

export default router;
