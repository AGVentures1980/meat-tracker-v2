import { Router } from 'express';
import { AnalystController } from '../controllers/AnalystController';

const router = Router();

// Retrieve ROI / Baseline Audit Report
router.get('/roi', AnalystController.getRoiReport);

// Update Frozen Baselines
router.put('/roi/:storeId/baselines', AnalystController.updateBaselines);

// Executive Scan (CFO Report)
router.get('/scan', AnalystController.getAnalystScan);

export default router;
