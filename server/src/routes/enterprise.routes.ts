import { Router } from 'express';
import { getEnterpriseMetrics } from '../controllers/enterpriseDashboardController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/dashboard', getEnterpriseMetrics);

export default router;
