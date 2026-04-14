import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { IntelligenceController } from '../controllers/IntelligenceController';

const router = Router();
const controller = new IntelligenceController();

// Phase 6 Core Intelligence Endpoints
router.post('/store/:store_id/snapshot', requireAuth, controller.generateSnapshot);
router.get('/store/:store_id/summary', requireAuth, controller.getStoreSummary);

// Fallback stubs for UI compatibility (pre-Phase 6 endpoints)
router.get('/anomalies', requireAuth, async (req, res) => res.json({ success: true, warning: 'Redirected to new Intelligence Engine' }));
router.get('/supply-suggestions', requireAuth, async (req, res) => res.json({ success: true, warning: 'Redirected to new Intelligence Engine' }));
router.get('/resolve-gtin', requireAuth, async (req, res) => res.json({ success: true, warning: 'Redirected to new Intelligence Engine' }));
router.post('/ocr/invoice', requireAuth, async (req, res) => res.json({ success: true, warning: 'Redirected to new Intelligence Engine' }));
router.get('/ocr/drifts', requireAuth, async (req, res) => res.json({ success: true, warning: 'Redirected to new Intelligence Engine' }));
router.get('/pilot-dashboard', requireAuth, async (req, res) => res.json({ success: true, warning: 'Redirected to new Intelligence Engine' }));

export default router;
