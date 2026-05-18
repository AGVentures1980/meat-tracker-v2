import { Router } from 'express';
import { ReportController } from '../controllers/ReportController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/executive-summary', requireAuth, ReportController.getExecutiveSummary);
router.get('/flash', requireAuth, ReportController.getFlashReport);
router.get('/variance', requireAuth, ReportController.getVarianceAnalysis);
router.get('/inventory', requireAuth, ReportController.getInventoryReport);
router.get('/meat-prices', requireAuth, ReportController.getMeatPrices);
router.get('/receiving-variance/:auditId/export', requireAuth, ReportController.exportReceivingVarianceReport);

export default router;
