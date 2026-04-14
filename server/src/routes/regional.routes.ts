import { Router } from 'express';
import { RegionalController } from '../controllers/RegionalController';

const router = Router();
const regionalController = new RegionalController();

// MODULE 3: Regional Oversight
router.get('/overview', regionalController.getRegionalOverview);

export default router;
