
import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';
import { SettingsController } from '../controllers/SettingsController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Dashboard Stats
router.get('/stats/:storeId', DashboardController.getStats);
router.get('/network', DashboardController.getNetworkStats);
router.get('/report-card', DashboardController.getNetworkReportCard);
router.get('/company-stats', DashboardController.getCompanyStats); // New Route for Dashboard.tsx
router.get('/company-aggregate', DashboardController.getCompanyAggregateStats);
router.get('/company-stats', DashboardController.getExecutiveStats); // New endpoint for ExecutiveSummary
router.post('/targets', DashboardController.updateStoreTargets);
router.get('/projections-data', DashboardController.getProjectionsData);

// System Settings
router.get('/settings', requireAuth, SettingsController.getSettings);
router.post('/settings', requireAuth, SettingsController.updateSettings);

export default router;
