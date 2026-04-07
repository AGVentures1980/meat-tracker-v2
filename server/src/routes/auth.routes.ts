import express from 'express';
import { AuthController } from '../controllers/AuthController';
import { requireAuth } from '../middleware/auth.middleware';
import { securityMiddleware } from '../middleware/SecurityMiddleware';

const router = express.Router();

// Public
router.post('/login', securityMiddleware, AuthController.login);
router.post('/request-demo', AuthController.requestDemo);
router.post('/forgot-password', securityMiddleware, AuthController.forgotPassword);
router.post('/reset-password', securityMiddleware, AuthController.resetPassword);

// Protected
router.post('/change-password', requireAuth, AuthController.changePassword);
router.post('/admin/force-reset/:id', requireAuth, AuthController.forceResetPassword);

export default router;
