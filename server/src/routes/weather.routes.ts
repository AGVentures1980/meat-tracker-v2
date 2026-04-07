import { Router } from 'express';
import { WeatherController } from '../controllers/WeatherController';

const router = Router();

// Discovery / Public weather advisory endpoint
// Optional requireAuth if you want it protected, but keeping lightweight for demo
router.get('/advisory', WeatherController.getAdvisory);

export default router;
