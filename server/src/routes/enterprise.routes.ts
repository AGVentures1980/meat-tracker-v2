import { Router } from 'express';
import { getEnterpriseMetrics, getNetworkSummary, getPropertyOutletSummary, getOutletKPI, getOutletInboundSnapshot, getOutletFlags, postOutletForecast, postOutletActualClose, getOutletForecastAccuracy, getPropertyForecastAccuracySummary, getOutletInboundReconciliation } from '../controllers/enterpriseDashboardController';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permissionMiddleware';

const router = Router();

// SRE TRIGGER: Temporary pilot seed
router.get('/trigger-pilot-seed', async (req, res) => {
    try {
        const seedTask = require('../scripts/seed_tampa_pilot').run;
        await seedTask();
        res.json({ success: true, message: 'Pilot seed successfully executed on production DB.' });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.use(requireAuth);

router.get('/dashboard', getEnterpriseMetrics);
router.get('/network-summary', getNetworkSummary);
router.get('/property/:storeId/outlet-summary', getPropertyOutletSummary);
router.get('/property/:storeId/forecast-accuracy-summary', getPropertyForecastAccuracySummary);

router.get('/outlet/:outletSlug/kpi', getOutletKPI);
router.get('/outlet/:outletSlug/inbound-snapshot', getOutletInboundSnapshot);
router.get('/outlet/:outletSlug/flags', getOutletFlags);

router.post('/outlet/:outletSlug/forecast', requirePermission('forecast_submission'), postOutletForecast);
router.post('/outlet/:outletSlug/actual-close', requirePermission('consumption_log'), postOutletActualClose);
router.get('/outlet/:outletSlug/forecast-accuracy', getOutletForecastAccuracy);
router.get('/outlet/:outletSlug/inbound-reconciliation', getOutletInboundReconciliation);

export default router;
