import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { getUserId, requireTenant, AuthContextMissingError } from '../utils/authContext';


const prisma = new PrismaClient();

export const UserController = {
    getHierarchy: async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const { layer } = req.query;

            // Only Directors, Area Managers, and Admins can query the corporate hierarchy
            if (user.role !== 'admin' && user.role !== 'director' && user.role !== 'area_manager') {
                return res.status(403).json({ error: 'Access Denied' });
            }

            if (layer === 'gms') {
                // Return Store Managers (is_primary = true)
                let storeIds: number[] = [];
                
                if (user.scope.type === 'AREA') {
                    storeIds = user.scope.storeIds || [];
                } else if (user.scope.type === 'COMPANY') {
                    const allStores = await prisma.store.findMany({
                        where: { company_id: user.scope.companyId },
                        select: { id: true }
                    });
                    storeIds = allStores.map(s => s.id);
                } else if (user.scope.type === 'GLOBAL') {
                    // Admin can see everything, optionally filtered by current view
                    const activeCompanyId = (req.headers['x-company-id'] as string) || user.companyId;
                    const allStores = await prisma.store.findMany({
                        where: { company_id: activeCompanyId }, // using the requested company scope or default
                        select: { id: true }
                    });
                    storeIds = allStores.map(s => s.id);
                }

                if (storeIds.length === 0) {
                    return res.json({ success: true, managers: [] });
                }

                const managers = await prisma.user.findMany({
                    where: { 
                        store_id: { in: storeIds },
                        is_primary: true
                    },
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        role: true,
                        position: true,
                        created_at: true,
                        store: {
                            select: { id: true, store_name: true }
                        }
                    },
                    orderBy: { first_name: 'asc' }
                });

                return res.json({ success: true, managers });
            }

            return res.status(400).json({ error: 'Invalid layer requested' });

        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('getHierarchy error:', error);
            res.status(500).json({ error: 'Failed to fetch hierarchy' });
        }
    },

    getStoreUsers: async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            let targetStoreId = user.storeId;

            // Optional query param for Admins, Directors, and Area Managers to view a specific store's users
            if (req.query.storeId) {
                targetStoreId = parseInt(req.query.storeId as string, 10);
                
                // Authorize Scope Exception
                if (user.scope.type === 'STORE' && targetStoreId !== user.scope.storeId) {
                    return res.status(403).json({ error: 'Scope Error: You can only view your own store' });
                }
                if (user.scope.type === 'AREA' && !user.scope.storeIds.includes(targetStoreId)) {
                    return res.status(403).json({ error: 'Scope Error: You are not authorized to view this store\'s team' });
                }
                if (user.scope.type === 'COMPANY') {
                    const store = await prisma.store.findUnique({ where: { id: targetStoreId } });
                    if (store?.company_id !== user.scope.companyId) {
                        return res.status(403).json({ error: 'Scope Error: Store belongs to another organization' });
                    }
                }
                // Admin (GLOBAL) skips validation
            }

            if (!targetStoreId) {
                return res.status(400).json({ error: 'Store ID is required' });
            }

            if (user.role === 'manager' && user.isPrimary === false) {
                return res.status(403).json({ error: 'Only the primary store account can view team members' });
            }

            const users = await prisma.user.findMany({
                where: { store_id: targetStoreId },
                select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                    role: true,
                    position: true,
                    created_at: true,
                    training_progress: true
                },
                orderBy: { created_at: 'asc' }
            });

            res.json({ success: true, users });
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('getStoreUsers error:', error);
            res.status(500).json({ error: 'Failed to fetch store users' });
        }
    },

    createStoreUser: async (req: Request, res: Response) => {
        try {
            const currentUser = (req as any).user;
            let targetStoreId = currentUser.storeId;

            // Optional override for Admins, Directors, and Area Managers
            if (req.body.store_id) {
                targetStoreId = parseInt(req.body.store_id as string, 10);

                // Authorize Scope Exception
                if (currentUser.scope.type === 'STORE' && targetStoreId !== currentUser.scope.storeId) {
                    return res.status(403).json({ error: 'Scope Error: You can only configure your own store' });
                }
                if (currentUser.scope.type === 'AREA' && !currentUser.scope.storeIds.includes(targetStoreId)) {
                    return res.status(403).json({ error: 'Scope Error: You are not authorized to add team members to this store' });
                }
                if (currentUser.scope.type === 'COMPANY') {
                    const store = await prisma.store.findUnique({ where: { id: targetStoreId } });
                    if (store?.company_id !== currentUser.scope.companyId) {
                        return res.status(403).json({ error: 'Scope Error: Store belongs to another organization' });
                    }
                }
                // Admin (GLOBAL) skips validation
            }

            if (!targetStoreId) {
                return res.status(400).json({ error: 'Store ID is required' });
            }

            if (currentUser.role === 'manager' && currentUser.isPrimary === false) {
                return res.status(403).json({ error: 'Only the primary store account can add team members' });
            }

            const { first_name, last_name, email, password, position, is_primary } = req.body;

            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required' });
            }

            // Check if email already exists
            const existingUser = await prisma.user.findUnique({
                where: { email }
            });

            if (existingUser) {
                return res.status(400).json({ error: 'Email already exists' });
            }

            const hash = await bcrypt.hash(password, 10);

            const newUser = await prisma.user.create({
                data: {
                    first_name,
                    last_name,
                    email,
                    password_hash: hash,
                    role: 'manager', // Store secondary users are also "manager" level for that store
                    position: position || null,
                    store_id: targetStoreId,
                    force_change: true,
                    is_primary: is_primary === true
                },
                select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                    role: true,
                    position: true
                }
            });

            res.json({ success: true, user: newUser });
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('createStoreUser error:', error);
            res.status(500).json({ error: 'Failed to create user' });
        }
    },

    deleteStoreUser: async (req: Request, res: Response) => {
        try {
            const currentUser = (req as any).user;
            const { id } = req.params;

            const targetUser = await prisma.user.findUnique({
                where: { id }
            });

            if (!targetUser) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Scope boundary enforcement for Delete
            const targetUserStoreId = targetUser.store_id;

            if (currentUser.scope.type === 'STORE') {
                if (targetUserStoreId !== currentUser.scope.storeId) {
                    return res.status(403).json({ error: 'Unauthorized to delete users outside your store' });
                }
                // Even within store, only primary account can delete secondary accounts
                if (currentUser.isPrimary === false) {
                    return res.status(403).json({ error: 'Only the primary store account can delete team members' });
                }
            } else if (currentUser.scope.type === 'AREA') {
                if (!targetUserStoreId || !currentUser.scope.storeIds.includes(targetUserStoreId)) {
                    return res.status(403).json({ error: 'Scope Error: User does not belong to a store in your Area' });
                }
            } else if (currentUser.scope.type === 'COMPANY') {
                if (!targetUserStoreId) {
                     return res.status(403).json({ error: 'Unauthorized to delete this corporate user' });
                }
                const store = await prisma.store.findUnique({ where: { id: targetUserStoreId } });
                if (store?.company_id !== currentUser.scope.companyId) {
                     return res.status(403).json({ error: 'Scope Error: User belongs to another organization' });
                }
            }

            // Ensure a user cannot delete themselves (or maybe they can? standard is no)
            if (targetUser.id === currentUser.userId) {
                return res.status(400).json({ error: 'Cannot delete your own account' });
            }

            // Delete training progress associated with the user before deleting the user
            await prisma.trainingProgress.deleteMany({
                where: { user_id: id }
            });

            await prisma.user.delete({
                where: { id }
            });

            res.json({ success: true, message: 'User deleted successfully' });
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('deleteStoreUser error:', error);
            res.status(500).json({ error: 'Failed to delete user' });
        }
    },

    acceptEula: async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            console.log(`[EULA] Acceptance request received for user ID: ${user?.userId}`);
            
            if (!user || !getUserId(user)) {
                console.warn('[EULA] Failed: Not authenticated or missing userId in token');
                return res.status(401).json({ error: 'Not authenticated' });
            }

            console.log(`[EULA] Proceeding to update database for user ID: ${getUserId(user)}`);
            await prisma.user.update({
                where: { id: getUserId(user) },
                data: {
                    eula_accepted_at: new Date()
                }
            });

            console.log(`[EULA] Success: Database updated for user ID: ${getUserId(user)}`);
            res.json({ success: true, message: 'EULA accepted successfully' });
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('[EULA] acceptEula error:', error);
            res.status(500).json({ error: 'Failed to accept EULA' });
        }
    },

    getAreaStores: async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            if (user.role !== 'area_manager') {
                return res.status(403).json({ error: 'Access Denied' });
            }

            const stores = await prisma.store.findMany({
                where: { area_manager_id: getUserId(user) },
                select: { id: true, store_name: true },
                orderBy: { store_name: 'asc' }
            });

            res.json({ success: true, stores });
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('getAreaStores error:', error);
            res.status(500).json({ error: 'Failed to fetch area stores' });
        }
    },

    getCompanyName: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const company = await prisma.company.findUnique({ where: { id }, select: { name: true, operationType: true } });
            if (!company) return res.status(404).json({ error: 'Company not found' });
            return res.json({ name: company.name, operationType: company.operationType });
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('getCompanyName error:', error);
            return res.status(500).json({ error: 'Failed to fetch company name' });
        }
    },

    setupFdcDirectors: async (req: Request, res: Response) => {
        try {
            const hash = await bcrypt.hash('Fogo2026@', 10);
            
            const neri = await prisma.user.upsert({
                where: { email: 'ngiachini@fogo.com' },
                update: { role: 'director', password_hash: hash, force_change: false },
                create: {
                    email: 'ngiachini@fogo.com',
                    first_name: 'Neri',
                    last_name: 'Giachini',
                    role: 'director',
                    password_hash: hash,
                    force_change: false
                }
            });

            const jean = await prisma.user.upsert({
                where: { email: 'jboschetti@fogo.com' },
                update: { role: 'director', password_hash: hash, force_change: false },
                create: {
                    email: 'jboschetti@fogo.com',
                    first_name: 'Jean',
                    last_name: 'Boschetti',
                    role: 'director',
                    password_hash: hash,
                    force_change: false
                }
            });

            res.json({ success: true, message: 'Neri and Jean directors created/updated successfully with password Fogo2026@' });
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('setupFdcDirectors error:', error);
            res.status(500).json({ error: 'Failed to setup FDC directors' });
        }
    },

    setupFdcAreaManagers: async (req: Request, res: Response) => {
        try {
            const hash = await bcrypt.hash('Fogo2026@', 10);
            
            const areaManagers = [
                { email: 'aconsoli@fogo.com', firstName: 'Adriano', lastName: 'Consoli' },
                { email: 'avelando@fogo.com', firstName: 'Alex', lastName: 'Velando' },
                { email: 'adasilva@fogo.com', firstName: 'Arlan', lastName: 'Da Silva' },
                { email: 'dpassaia@fogo.com', firstName: 'Daurio', lastName: 'Passaia' },
                { email: 'jpasquesi@fogo.com', firstName: 'Joe', lastName: 'Pasquesi' },
                { email: 'jalmeida@fogo.com', firstName: 'Jorge', lastName: 'Almeida' },
                { email: 'mbonfada@fogo.com', firstName: 'Marcio', lastName: 'Bonfada' },
                { email: 'nhensel@fogo.com', firstName: 'Neimar', lastName: 'Hensel' },
                { email: 'rmolinaro@fogo.com', firstName: 'Rogerio', lastName: 'Molinaro' },
                { email: 'rbonfada@fogo.com', firstName: 'Rudimar', lastName: 'Bonfada' },
                { email: 'vmachado@fogo.com', firstName: 'Valdenir', lastName: 'Machado' },
                { email: 'vmelchior@fogo.com', firstName: 'Vanderlei', lastName: 'Melchior' },
                { email: 'vitormelchior@fogo.com', firstName: 'Vitor', lastName: 'Melchior' }
            ];

            const results = [];

            for (const am of areaManagers) {
                const user = await prisma.user.upsert({
                    where: { email: am.email },
                    update: { role: 'area_manager', password_hash: hash, first_name: am.firstName, last_name: am.lastName },
                    create: {
                        email: am.email,
                        first_name: am.firstName,
                        last_name: am.lastName,
                        role: 'area_manager',
                        password_hash: hash,
                        force_change: false
                    }
                });
                results.push(user.email);
            }

            res.json({ success: true, message: `Successfully restored ${results.length} Area Managers: ${results.join(', ')} with password Fogo2026@` });
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('setupFdcAreaManagers error:', error);
            res.status(500).json({ error: 'Failed to setup FDC Area Managers' });
        }
    }
};
