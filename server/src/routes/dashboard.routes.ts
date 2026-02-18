
import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';
import { SettingsController } from '../controllers/SettingsController';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Dashboard Stats
router.get('/stats/:storeId', requireAuth, DashboardController.getStats);
router.get('/stats/network', requireAuth, requireRole([Role.admin, Role.director]), DashboardController.getNetworkStats);
router.get('/stats/audit-logs', requireAuth, requireRole([Role.admin, Role.director]), DashboardController.getAuditLogAnalysis);
router.get('/stats/villain-deep-dive', requireAuth, requireRole([Role.admin, Role.director]), DashboardController.getVillainDeepDive);
router.get('/stats/report-card', requireAuth, requireRole([Role.admin, Role.director]), DashboardController.getNetworkReportCard);
router.get('/performance-audit', requireAuth, requireRole([Role.admin, Role.director]), DashboardController.getPerformanceAudit);
router.get('/bi-report-card', requireAuth, requireRole([Role.admin, Role.director]), DashboardController.getNetworkReportCard); // Alias for Stale Frontend
router.get('/company-stats', requireAuth, requireRole([Role.admin, Role.director]), DashboardController.getCompanyStats);
router.post('/targets', requireAuth, requireRole([Role.admin, Role.director]), DashboardController.updateStoreTargets);
router.get('/projections-data', requireAuth, DashboardController.getProjectionsData);
router.post('/targets/sync', requireAuth, requireRole([Role.admin, Role.director]), DashboardController.syncStoreTargets);

// System Settings
router.get('/settings', requireAuth, SettingsController.getSettings);
router.post('/settings', requireAuth, SettingsController.updateSettings);

// Company Management (Phase 10)
import { CompanyController } from '../controllers/CompanyController';

router.get('/company/products', requireAuth, CompanyController.getProducts);
router.post('/company/products', requireAuth, requireRole([Role.admin, Role.director]), CompanyController.addProduct);
router.delete('/company/products/:id', requireAuth, requireRole([Role.admin, Role.director]), CompanyController.deleteProduct);

router.get('/company/stores', requireAuth, CompanyController.getStores);
router.post('/company/stores', requireAuth, requireRole([Role.admin, Role.director]), CompanyController.addStore);
router.delete('/company/stores/:id', requireAuth, requireRole([Role.admin, Role.director]), CompanyController.deleteStore);

// Store Templates (Phase 12)
import { TemplateController } from '../controllers/TemplateController';

router.get('/company/templates', requireAuth, TemplateController.listTemplates);
router.post('/company/templates', requireAuth, requireRole([Role.admin, Role.director]), TemplateController.createTemplate);
router.post('/company/stores/:id/apply-template', requireAuth, TemplateController.applyTemplate);


// Store Management
router.get('/settings/stores', requireAuth, SettingsController.getStores);
router.post('/settings/stores', requireAuth, SettingsController.createStore);
router.put('/settings/stores/:id', requireAuth, SettingsController.updateStore);
router.post('/settings/no-delivery', requireAuth, SettingsController.setNoDeliveryFlag);
router.get('/settings/company-products', requireAuth, SettingsController.getCompanyProducts);

// Smart Prep (Kitchen Intelligence)
import { SmartPrepController } from '../controllers/SmartPrepController';
import { NetworkHealthController } from '../controllers/NetworkHealthController';
import { WasteController } from '../controllers/WasteController';

router.get('/smart-prep', requireAuth, SmartPrepController.getDailyPrep);
router.get('/smart-prep/network-status', requireAuth, SmartPrepController.getNetworkPrepStatus);
router.post('/smart-prep/lock', requireAuth, SmartPrepController.lockPrepPlan);
router.get('/network-health', requireAuth, NetworkHealthController.getNetworkStats);

// Training & Governance (Phase 13)
import { TrainingController } from '../controllers/TrainingController';

router.get('/training/status', requireAuth, TrainingController.getStatus);
router.post('/training/progress', requireAuth, TrainingController.saveProgress);
router.post('/training/exam-attempt', requireAuth, TrainingController.submitExam);
router.get('/training/audit', requireAuth, requireRole([Role.admin, Role.director]), TrainingController.getAudit);
router.post('/training/reset', requireAuth, requireRole([Role.admin, Role.director]), TrainingController.resetProgress);

// Waste Management (The Garcia Rule)
router.get('/waste/status', requireAuth, WasteController.getStatus);
router.get('/waste/network-status', requireAuth, WasteController.getNetworkWasteStatus);
router.get('/waste/network-accountability', requireAuth, requireRole([Role.admin, Role.director]), WasteController.getNetworkAccountabilityStatus);
router.get('/waste/history', requireAuth, WasteController.getHistory);
router.get('/waste/history/details', requireAuth, WasteController.getDetailedHistory);
router.post('/waste/log', requireAuth, WasteController.logWaste);

export default router;
