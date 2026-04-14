import { Router } from 'express';
import { StoreController } from '../controllers/StoreController';

const router = Router();
const storeController = new StoreController();

// MODULE 2: Store Action Console
router.get('/actions', storeController.getStoreActions);

export default router;
