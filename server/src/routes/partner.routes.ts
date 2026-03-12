import { Router } from 'express';
import { PartnerController } from '../controllers/PartnerController';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

// ============================================================================
// PARTNER PORTAL ENDPOINTS
// Completely isolated routes (Zero-Regression)
// ============================================================================

// All partner routes require a valid JWT AND the 'partner' role
router.use(requireAuth);
router.use(requireRole(['partner']));

// Dashboard / Overview
router.get('/dashboard', PartnerController.getDashboardStats);

// Proposals (Smart Contracting)
router.post('/proposals', PartnerController.createProposal);

export default router;
