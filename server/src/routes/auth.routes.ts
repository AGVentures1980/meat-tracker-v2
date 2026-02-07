import express from 'express';
import { AuthController } from '../controllers/AuthController';
import { requireAuth } from '../middleware/auth.middleware';

const router = express.Router();

// Public
router.post('/login', AuthController.login);

// Protected
router.post('/change-password', requireAuth, AuthController.changePassword);

export default router;
