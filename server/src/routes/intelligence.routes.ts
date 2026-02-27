import { Router } from 'express';
import { IntelligenceController } from '../controllers/IntelligenceController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/anomalies', requireAuth, IntelligenceController.getAnomalies);

// Any store manager can see their supply suggestions
router.get('/supply-suggestions', requireAuth, IntelligenceController.getSupplySuggestions);

export default router;
