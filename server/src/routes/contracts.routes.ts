import { Router } from 'express';
import { ContractController } from '../controllers/ContractController';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Master Admin only routes
router.use(requireAuth);
router.use(requireRole(['admin', 'director']));

router.post('/generate', ContractController.generateContract);
router.post('/dispatch', ContractController.dispatchSignatureRequest);
router.post('/mock-webhook', ContractController.simulateSignatureWebhook);
router.get('/', ContractController.getAllContracts);
router.put('/:id', ContractController.updateContract);
router.delete('/:id', ContractController.deleteContract);

export default router;
