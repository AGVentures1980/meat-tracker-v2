
import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';
import { SettingsController } from '../controllers/SettingsController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Dashboard Stats
router.get('/stats/:storeId', requireAuth, DashboardController.getStats);
router.get('/network', requireAuth, DashboardController.getNetworkStats);
router.get('/report-card', requireAuth, DashboardController.getNetworkReportCard);
router.get('/company-stats', requireAuth, DashboardController.getCompanyStats); // New Route for Dashboard.tsx
router.get('/company-aggregate', requireAuth, DashboardController.getCompanyAggregateStats);
router.get('/company-stats', requireAuth, DashboardController.getExecutiveStats); // New endpoint for ExecutiveSummary
router.post('/targets', requireAuth, DashboardController.updateStoreTargets);
router.get('/projections-data', requireAuth, DashboardController.getProjectionsData);

// System Settings
router.get('/settings', requireAuth, SettingsController.getSettings);
router.post('/settings', requireAuth, SettingsController.updateSettings);

export default router;
