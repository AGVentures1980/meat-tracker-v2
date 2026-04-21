import { Router } from 'express';
import { getEnterpriseMetrics, getNetworkSummary, getPropertyOutletSummary, getOutletKPI, getOutletInboundSnapshot, getOutletFlags, postOutletForecast, postOutletActualClose, getOutletForecastAccuracy, getPropertyForecastAccuracySummary, getOutletInboundReconciliation } from '../controllers/enterpriseDashboardController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/dashboard', getEnterpriseMetrics);
router.get('/network-summary', getNetworkSummary);
router.get('/property/:storeId/outlet-summary', getPropertyOutletSummary);
router.get('/property/:storeId/forecast-accuracy-summary', getPropertyForecastAccuracySummary);

router.get('/outlet/:outletSlug/kpi', getOutletKPI);
router.get('/outlet/:outletSlug/inbound-snapshot', getOutletInboundSnapshot);
router.get('/outlet/:outletSlug/flags', getOutletFlags);

router.post('/outlet/:outletSlug/forecast', postOutletForecast);
router.post('/outlet/:outletSlug/actual-close', postOutletActualClose);
router.get('/outlet/:outletSlug/forecast-accuracy', getOutletForecastAccuracy);
router.get('/outlet/:outletSlug/inbound-reconciliation', getOutletInboundReconciliation);

export default router;
