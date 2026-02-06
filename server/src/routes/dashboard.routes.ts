
import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';

const router = Router();

router.get('/:storeId', DashboardController.getStats);

export default router;
