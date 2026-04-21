import { Router } from 'express';
import { upsertForecastLog } from '../controllers/forecastLogController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.post('/upsert-log', upsertForecastLog);

export default router;
