
import { Router } from 'express';
import { ForecastController } from '../controllers/ForecastController';

const router = Router();

// Get forecast for a specific week (e.g. ?date=2024-03-18)
router.get('/next-week', ForecastController.getForecast);

// Upsert forecast (Create/Update with Wednesday Lock logic)
router.post('/upsert', ForecastController.upsertForecast);

export default router;
