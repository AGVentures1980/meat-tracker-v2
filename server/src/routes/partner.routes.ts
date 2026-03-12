import { Router } from 'express';
import { PartnerController } from '../controllers/PartnerController';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

// ============================================================================
// PARTNER PORTAL ENDPOINTS
// Completely isolated routes (Zero-Regression)
// ============================================================================

// All partner routes require a valid JWT AND the 'partner' role or admin privileges
router.use(requireAuth);
router.use(requireRole(['partner', 'admin', 'director']));

// Profile / Onboarding Security Check
router.get('/profile', PartnerController.getProfile);

// Dashboard / Overview
router.get('/dashboard', PartnerController.getDashboardStats);

// Deals & Autonomous Provisioning
router.post('/proposals', PartnerController.createProposal);
router.post('/provision-tenant', PartnerController.provisionTenant);

// Onboarding Flow
router.post('/onboarding/agreement', PartnerController.signAgreement);
router.post('/onboarding/training', PartnerController.completeTraining);

export default router;
