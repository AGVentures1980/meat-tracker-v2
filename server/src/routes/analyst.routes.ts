import { Router } from 'express';
import { AnalystController } from '../controllers/AnalystController';

const router = Router();

// Retrieve ROI / Baseline Audit Report
router.get('/roi', AnalystController.getRoiReport);

export default router;
