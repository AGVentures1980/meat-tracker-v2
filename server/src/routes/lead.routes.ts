import { Router } from 'express';
import { submitLead, getLeads } from '../controllers/LeadController';

const router = Router();

// Public route to capture website leads
router.post('/public/leads', submitLead);

// Protected route to view leads (will be secured in index.ts)
router.get('/leads', getLeads);

export default router;
