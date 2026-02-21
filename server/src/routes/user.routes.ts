import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Store Managers can manage users for their store
router.get('/store', requireAuth, requireRole([Role.manager, Role.admin, Role.director]), UserController.getStoreUsers);
router.post('/store', requireAuth, requireRole([Role.manager, Role.admin, Role.director]), UserController.createStoreUser);
router.delete('/store/:id', requireAuth, requireRole([Role.manager, Role.admin, Role.director]), UserController.deleteStoreUser);

export default router;
