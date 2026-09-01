import express from 'express';
import { PulseController } from '../controllers/PulseController';
import { requireAuth } from '../middleware/auth.middleware';

const router = express.Router();

// Protected Handoff Endpoint
router.post('/handoff', requireAuth, PulseController.generateHandoff);

export default router;
