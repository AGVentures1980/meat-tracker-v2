import { Router } from 'express';
import { AnalystController } from '../controllers/AnalystController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Only admin/director can access Deep Analysis
router.get('/scan', requireAuth, (req, res, next) => {
    const userRole = (req as any).user?.role;
    if (userRole !== 'admin' && userRole !== 'director') {
        return res.status(403).json({ success: false, error: 'Forbidden: Executive Access Only' });
    }
    next();
}, AnalystController.getDeepAnalysis);

export default router;
