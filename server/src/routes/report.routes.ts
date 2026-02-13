import { Router } from 'express';
import { ReportController } from '../controllers/ReportController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/executive-summary', requireAuth, ReportController.getExecutiveSummary);
router.get('/flash', requireAuth, ReportController.getFlashReport);
router.get('/variance', requireAuth, ReportController.getVarianceAnalysis);
router.get('/inventory', requireAuth, ReportController.getInventoryReport);

export default router;
