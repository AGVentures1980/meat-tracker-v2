import { Router } from 'express';
import { NegotiationController } from '../controllers/NegotiationController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Only admin/director can access Negotiation Logic
router.get('/proposal', requireAuth, (req, res, next) => {
    const userRole = (req as any).user?.role;
    if (userRole !== 'admin' && userRole !== 'director') {
        return res.status(403).json({ success: false, error: 'Forbidden: Executive Access Only' });
    }
    next();
}, NegotiationController.getProposal);

export default router;
