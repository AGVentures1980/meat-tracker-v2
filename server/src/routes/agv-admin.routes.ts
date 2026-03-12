import { Router } from 'express';
import { AdminPartnerController } from '../controllers/AdminPartnerController';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

// ============================================================================
// AGV OWNER COMMAND CENTER - PARTNER OVERSIGHT
// These routes are strictly reserved for AGV Master Admins
// ============================================================================

router.use(requireAuth);
router.use(requireRole(['admin']));

// Get the Global Partner Network Cards
router.get('/network', AdminPartnerController.getAllPartners);

// Get Pending/Escalated Proposals
router.get('/escalated', AdminPartnerController.getEscalatedProposals);
router.delete('/escalated/:proposalId', AdminPartnerController.deleteProposal);
router.post('/escalated/:proposalId/provision', AdminPartnerController.forceProvisionProposal);

// Execute Batched PayPal Payouts
router.post('/payouts/execute', AdminPartnerController.executePayouts);

// Contracts Vault (Signed Partner Agreements)
router.get('/vault', AdminPartnerController.getVaultAgreements);

export default router;
