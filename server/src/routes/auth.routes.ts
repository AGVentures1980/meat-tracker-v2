import express from 'express';
import { AuthController } from '../controllers/AuthController';
import { requireAuth } from '../middleware/auth.middleware';
import { securityMiddleware } from '../middleware/SecurityMiddleware';

const router = express.Router();

// Public
router.post('/login', securityMiddleware, AuthController.login);
router.post('/request-demo', AuthController.requestDemo);

// Protected
router.post('/change-password', requireAuth, AuthController.changePassword);

export default router;
