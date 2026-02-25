import { Router } from 'express';
import { VaultController } from '../controllers/VaultController';
import { requireAuth } from '../middleware/auth.middleware';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// Require user to be logged in to even attempt PIN validation
router.post('/verify', requireAuth, VaultController.verifyPin);
router.get('/messages', requireAuth, VaultController.getMessages);
router.post('/messages', requireAuth, upload.single('file'), VaultController.postMessage);

export default router;
