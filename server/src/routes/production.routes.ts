import { Router } from 'express';
import { ProductionEngineController } from '../controllers/ProductionEngineController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.post('/start', ProductionEngineController.startProduction);
router.post('/record', ProductionEngineController.recordProduction);

export default router;
