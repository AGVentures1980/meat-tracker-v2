import express from 'express';
import { PulseController } from '../controllers/PulseController';
import { requireAuth } from '../middleware/auth.middleware';

const router = express.Router();

// Protected Handoff Endpoint
router.post('/handoff', requireAuth, PulseController.generateHandoff);

// Entitlement status check
router.get('/entitlement/status', requireAuth, PulseController.getEntitlementStatus);

// Admin-only Entitlement toggle
router.post('/entitlement/toggle', requireAuth, PulseController.toggleEntitlement);

export default router;
