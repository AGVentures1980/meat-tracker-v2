import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Store Managers and Area Managers can manage users for their store
router.get('/hierarchy', requireAuth, requireRole([Role.admin, Role.director, Role.area_manager]), UserController.getHierarchy);
router.get('/store', requireAuth, requireRole([Role.manager, Role.admin, Role.director, Role.area_manager]), UserController.getStoreUsers);
router.post('/store', requireAuth, requireRole([Role.manager, Role.admin, Role.director, Role.area_manager]), UserController.createStoreUser);
router.delete('/store/:id', requireAuth, requireRole([Role.manager, Role.admin, Role.director, Role.area_manager]), UserController.deleteStoreUser);

// Area Manager Stores
router.get('/area-stores', requireAuth, requireRole([Role.area_manager]), UserController.getAreaStores);
// EULA Acceptance
router.post('/accept-eula', requireAuth, UserController.acceptEula);

// Helper to inject FDC Directors
router.get('/setup-fdc-directors', UserController.setupFdcDirectors);
router.get('/setup-fdc-ams', UserController.setupFdcAreaManagers);

export default router;
