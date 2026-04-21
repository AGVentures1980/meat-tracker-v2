import { Router } from 'express';
import { getEnterpriseMetrics, getNetworkSummary, getPropertyOutletSummary, getOutletKPI, getOutletInboundSnapshot, getOutletFlags } from '../controllers/enterpriseDashboardController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/dashboard', getEnterpriseMetrics);
router.get('/network-summary', getNetworkSummary);
router.get('/property/:storeId/outlet-summary', getPropertyOutletSummary);

router.get('/outlet/:outletSlug/kpi', getOutletKPI);
router.get('/outlet/:outletSlug/inbound-snapshot', getOutletInboundSnapshot);
router.get('/outlet/:outletSlug/flags', getOutletFlags);

export default router;
