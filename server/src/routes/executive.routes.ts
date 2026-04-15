import { Router } from 'express';
import { ExecutiveController } from '../controllers/ExecutiveController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
const executiveController = new ExecutiveController();

// PROTECTED ENDPOINTS
// Ensures token must be valid and tenant extracted
router.use(requireAuth); 

// MODULE 1: V1 Executive Dashboard (Replaces V0 Legacy)
router.get('/overview/cache', executiveController.getExecutiveOverview);

export default router;
