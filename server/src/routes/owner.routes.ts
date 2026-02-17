import { Router } from 'express';
import { OwnerController } from '../controllers/OwnerController';
import { BillingController } from '../controllers/BillingController';
import { ProspectingAgent } from '../services/ProspectingAgent';
import { requireAuth } from '../middleware/auth.middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
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

router.get('/prospecting/leads', requireAuth, async (req, res) => {
    try {
        const leads = await prisma.prospect.findMany({
            orderBy: { created_at: 'desc' }
        });
        res.json({ success: true, leads });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/prospecting/send-email', requireAuth, OwnerController.sendLeadEmail);

export default router;
