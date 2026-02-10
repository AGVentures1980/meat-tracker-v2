
import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';
import { SettingsController } from '../controllers/SettingsController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Dashboard Stats
router.get('/stats/:storeId', DashboardController.getStats);
router.get('/network', DashboardController.getNetworkStats);
router.get('/report-card', DashboardController.getNetworkReportCard);
router.get('/bi-report-card', DashboardController.getNetworkReportCard); // Alias for Stale Frontend
router.get('/company-stats', DashboardController.getCompanyStats);
router.post('/targets', DashboardController.updateStoreTargets);
router.get('/projections-data', DashboardController.getProjectionsData);
router.post('/targets/sync', requireAuth, DashboardController.syncStoreTargets);

// System Settings
router.get('/settings', requireAuth, SettingsController.getSettings);
router.post('/settings', requireAuth, SettingsController.updateSettings);

// Store Management
router.get('/settings/stores', requireAuth, SettingsController.getStores);
router.post('/settings/stores', requireAuth, SettingsController.createStore);

// Smart Prep (Kitchen Intelligence)
import { SmartPrepController } from '../controllers/SmartPrepController';
router.get('/smart-prep', requireAuth, SmartPrepController.getDailyPrep);

export default router;
