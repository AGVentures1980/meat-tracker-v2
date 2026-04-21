import { Router } from 'express';
import { InventoryController } from '../controllers/InventoryController';
import { InventoryEngineController } from '../controllers/InventoryEngineController';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permissionMiddleware';

const router = Router();
router.use(requireAuth);

router.post('/weekly-close', requirePermission('consumption_log'), InventoryController.submitWeeklyClose);
router.post('/pull-to-prep', requirePermission('prep_log'), InventoryController.pullToPrep);
router.post('/box/consume', requirePermission('consumption_log'), InventoryController.consumeBox);
router.post('/box/waste', requirePermission('consumption_log'), InventoryController.wasteBox);

// GO-LIVE DDD 
router.post('/weekly', requirePermission('consumption_log'), InventoryEngineController.submitWeeklyInventory);

export default router;
