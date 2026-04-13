import express from 'express';
import { ValidationController } from '../controllers/ValidationController';
// In a real app we'd import the authMiddleware here to secure routes initially.
// For demonstration and fail-closed implementation, the controller handles exact user role gating.

const router = express.Router();
const controller = new ValidationController();

// Mock middleware injecting user from the request context (already present in the real app)
// router.use(authMiddleware);

router.get('/overview', controller.getOverview);
router.get('/dataset', controller.getDataset);
router.get('/pipeline-metrics', controller.getPipelineMetrics);
router.get('/errors', controller.getErrors);
router.get('/quarantine', controller.getQuarantine);
router.get('/shadow', controller.getShadowMode);
router.get('/audit', controller.getAudit);

router.post('/run', (req, res) => controller.runValidation(req, res));
router.post('/import', (req, res) => controller.importDataset(req, res));
router.post('/import/barcode', (req, res) => controller.importBarcode(req, res));
router.post('/import/olo', (req, res) => controller.importOlo(req, res));
router.post('/import/invoice', (req, res) => controller.importInvoice(req, res));
router.post('/import/image', (req, res) => controller.importImage(req, res));
router.post('/import/bulk', (req, res) => controller.importBulk(req, res));

export default router;
