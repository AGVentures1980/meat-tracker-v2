import { Router } from 'express';
import { IntelligenceController } from '../controllers/IntelligenceController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Only admin/director can see across-store anomalies
router.get('/anomalies', requireAuth, (req, res, next) => {
    const userRole = (req as any).user?.role;
    if (userRole !== 'admin' && userRole !== 'director') {
        return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    next();
}, IntelligenceController.getAnomalies);

// Any store manager can see their supply suggestions
router.get('/supply-suggestions', requireAuth, IntelligenceController.getSupplySuggestions);

export default router;
