import express from 'express';
import { VaultController } from '../controllers/VaultController';
import { requireAuth, requireScope } from '../middleware/auth.middleware';

const router = express.Router();

// SRE Kill Switch: Instantly severs the entire Vault API layer natively
router.use((req, res, next) => {
    if (process.env.ENABLE_VAULT === 'false') {
        return res.status(404).json({ error: 'Vault API is currently offline.' });
    }
    next();
});

router.use(requireAuth);

// Store is the baseline rank, which allows STORE, AREA, COMPANY, and GLOBAL.
// But GLOBAL is intercepted and forced to provide X-Audit-Reason.
router.post('/request-upload', requireScope('STORE'), VaultController.requestUpload);
router.post('/confirm-upload', requireScope('STORE'), VaultController.confirmUpload);
router.get('/access/:id', requireScope('STORE'), VaultController.accessFile);

export default router;
