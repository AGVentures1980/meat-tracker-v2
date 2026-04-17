import { Router } from 'express';
import { InventoryController } from '../controllers/InventoryController';
import { InventoryEngineController } from '../controllers/InventoryEngineController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.post('/weekly-close', InventoryController.submitWeeklyClose);
router.post('/pull-to-prep', InventoryController.pullToPrep);
router.post('/box/consume', InventoryController.consumeBox);
router.post('/box/waste', InventoryController.wasteBox);

// GO-LIVE DDD 
router.post('/weekly', InventoryEngineController.submitWeeklyInventory);

export default router;
