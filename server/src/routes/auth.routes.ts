import express from 'express';
import { AuthController } from '../controllers/AuthController';
import { requireAuth } from '../middleware/auth.middleware';
import { securityMiddleware } from '../middleware/SecurityMiddleware';

import { loginRateLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Public
router.post('/login', loginRateLimiter, securityMiddleware, AuthController.login);
router.post('/request-demo', loginRateLimiter, AuthController.requestDemo);
router.post('/forgot-password', loginRateLimiter, securityMiddleware, AuthController.forgotPassword);
router.post('/reset-password', loginRateLimiter, securityMiddleware, AuthController.resetPassword);

// Protected
router.post('/change-password', requireAuth, AuthController.changePassword);
router.post('/admin/force-reset/:id', requireAuth, AuthController.forceResetPassword);

export default router;
