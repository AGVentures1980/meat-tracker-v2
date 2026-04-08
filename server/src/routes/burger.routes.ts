import { Router } from 'express';
import { BurgerIntelligenceController } from '../controllers/BurgerIntelligenceController';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/dashboard', requireAuth, BurgerIntelligenceController.getDashboard);
router.post('/aloha-sync', requireAuth, BurgerIntelligenceController.syncAloha);
router.post('/audit', requireAuth, BurgerIntelligenceController.managerAudit);

export default router;
