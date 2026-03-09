import { Router } from 'express';
import { IntelligenceController } from '../controllers/IntelligenceController';
import { ProcurementIntelligenceController } from '../controllers/ProcurementIntelligenceController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/anomalies', requireAuth, IntelligenceController.getAnomalies);

// Any store manager can see their supply suggestions
router.get('/supply-suggestions', requireAuth, IntelligenceController.getSupplySuggestions);

// AI Procurement Shadow Mode (Alexandre Only - enforced in controller)
router.get('/procurement-shadow', requireAuth, ProcurementIntelligenceController.getShadowDashboardData);
router.post('/procurement-feedback', requireAuth, ProcurementIntelligenceController.submitFeedback);

export default router;
