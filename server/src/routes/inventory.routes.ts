import { Router } from 'express';
import { InventoryController } from '../controllers/InventoryController';
import { InventoryEngineController } from '../controllers/InventoryEngineController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.post('/weekly-close', InventoryController.submitWeeklyClose);
router.post('/pull-to-prep', InventoryController.pullToPrep);
router.post('/box/consume', InventoryController.consumeBox);
router.post('/box/waste', InventoryController.wasteBox);

// GO-LIVE DDD 
router.post('/weekly', InventoryEngineController.submitWeeklyInventory);

export default router;
