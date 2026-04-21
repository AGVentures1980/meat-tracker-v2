import { Router } from 'express';
import { ProductionEngineController } from '../controllers/ProductionEngineController';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permissionMiddleware';

const router = Router();
router.use(requireAuth);

router.post('/start', requirePermission('prep_log'), ProductionEngineController.startProduction);
router.post('/record', requirePermission('prep_record'), ProductionEngineController.recordProduction);

export default router;
