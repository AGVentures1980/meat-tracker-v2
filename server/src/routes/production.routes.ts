import { Router } from 'express';
import { ProductionEngineController } from '../controllers/ProductionEngineController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.post('/start', ProductionEngineController.startProduction);
router.post('/record', ProductionEngineController.recordProduction);

export default router;
