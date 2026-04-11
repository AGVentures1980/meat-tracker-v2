import { Router } from 'express';
import { InventoryController } from '../controllers/InventoryController';

const router = Router();

router.post('/weekly-close', InventoryController.submitWeeklyClose);
router.post('/pull-to-prep', InventoryController.pullToPrep);
router.post('/box/consume', InventoryController.consumeBox);
router.post('/box/waste', InventoryController.wasteBox);

export default router;
