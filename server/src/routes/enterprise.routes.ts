import { Router } from 'express';
import { getEnterpriseMetrics, getNetworkSummary, getPropertyOutletSummary } from '../controllers/enterpriseDashboardController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/dashboard', getEnterpriseMetrics);
router.get('/network-summary', getNetworkSummary);
router.get('/property/:storeId/outlet-summary', getPropertyOutletSummary);

export default router;
