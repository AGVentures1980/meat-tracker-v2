
import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';

const router = Router();

// Specific routes first to avoid catching by :storeId
router.get('/bi-network', DashboardController.getNetworkStats);
router.get('/:storeId', DashboardController.getStats);

export default router;
