import { Router } from 'express';
import { ComplianceController } from '../controllers/ComplianceController';

const router = Router();
const controller = new ComplianceController();

router.post('/specs', controller.createCorporateSpec);
router.get('/specs/:companyId', controller.getCorporateSpecs);

export default router;
