
import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';

const router = Router();

// Specific routes first to avoid catching by :storeId
// Specific routes first
router.get('/company-stats', DashboardController.getCompanyAggregateStats);
router.post('/targets', DashboardController.updateStoreTargets);
router.get('/bi-network', DashboardController.getNetworkStats);
router.get('/bi-report-card', DashboardController.getNetworkReportCard);
router.get('/:storeId', DashboardController.getStats);

export default router;
