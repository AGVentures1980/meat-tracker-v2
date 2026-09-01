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

// Master Location Manifest Export Endpoints (Phase 7B-5L)
router.get('/master-manifest', requireAuth, PulseController.getMasterManifest);
router.get('/ecosystem/master-locations', requireAuth, PulseController.getMasterManifest);

export default router;
