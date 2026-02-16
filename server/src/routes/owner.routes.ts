import { Router } from 'express';
import { OwnerController } from '../controllers/OwnerController';
import { BillingController } from '../controllers/BillingController';
import { ProspectingAgent } from '../services/ProspectingAgent';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Global Setup (Developer/Admin only)
router.get('/setup-owner', OwnerController.setupOwnerCompanies);

// Multi-Company Retrieval
router.get('/my-companies', requireAuth, OwnerController.getMyCompanies);

// Financial Billing
router.post('/billing/generate', requireAuth, BillingController.generateMonthlyInvoice);
router.get('/billing/finances', requireAuth, BillingController.getOwnerFinances);

// Prospecting (AI Agent)
router.post('/prospecting/discover', requireAuth, async (req, res) => {
    const result = await ProspectingAgent.discoverNewProspects();
    res.json(result);
});

export default router;
