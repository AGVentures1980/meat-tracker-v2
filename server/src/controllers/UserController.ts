import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export const UserController = {
    getStoreUsers: async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            let targetStoreId = user.storeId;

            // Optional query param for Admins and Area Managers to view a specific store's users
            if ((user.role === 'admin' || user.role === 'director' || user.role === 'area_manager') && req.query.storeId) {
                targetStoreId = parseInt(req.query.storeId as string, 10);

                // If area_manager, verify they supervise this store
                if (user.role === 'area_manager') {
                    const storeCheck = await prisma.store.findFirst({
                        where: { id: targetStoreId, area_manager_id: user.userId }
                    });
                    if (!storeCheck) {
                        return res.status(403).json({ error: 'You are not authorized to view this store\'s team' });
                    }
                }
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
        } catch (error) {
            console.error('getStoreUsers error:', error);
            res.status(500).json({ error: 'Failed to fetch store users' });
        }
    },

    createStoreUser: async (req: Request, res: Response) => {
        try {
            const currentUser = (req as any).user;
            let targetStoreId = currentUser.storeId;

            // Optional override for Admins and Area Managers
            if ((currentUser.role === 'admin' || currentUser.role === 'director' || currentUser.role === 'area_manager') && req.body.store_id) {
                targetStoreId = parseInt(req.body.store_id as string, 10);

                // If area manager, verify they supervise this store
                if (currentUser.role === 'area_manager') {
                    const storeCheck = await prisma.store.findFirst({
                        where: { id: targetStoreId, area_manager_id: currentUser.userId }
                    });
                    if (!storeCheck) {
                        return res.status(403).json({ error: 'You are not authorized to add team members to this store' });
                    }
                }
            }

            if (!targetStoreId) {
                return res.status(400).json({ error: 'Store ID is required' });
            }

            if (currentUser.role === 'manager' && currentUser.isPrimary === false) {
                return res.status(403).json({ error: 'Only the primary store account can add team members' });
            }

            const { first_name, last_name, email, password, position } = req.body;

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
                    force_change: true
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
        } catch (error) {
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

            // Ensure the manager only deletes users from their own store
            if (currentUser.role === 'manager') {
                if (targetUser.store_id !== currentUser.storeId) {
                    return res.status(403).json({ error: 'Unauthorized to delete this user' });
                }
                if (currentUser.isPrimary === false) {
                    return res.status(403).json({ error: 'Only the primary store account can delete team members' });
                }
            } else if (currentUser.role === 'area_manager') {
                // Area manager can only delete if they supervise the user's store
                if (!targetUser.store_id) {
                    return res.status(403).json({ error: 'Unauthorized to delete this user' });
                }
                const storeCheck = await prisma.store.findFirst({
                    where: { id: targetUser.store_id, area_manager_id: currentUser.userId }
                });
                if (!storeCheck) {
                    return res.status(403).json({ error: 'Unauthorized to delete a team member from this store' });
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
        } catch (error) {
            console.error('deleteStoreUser error:', error);
            res.status(500).json({ error: 'Failed to delete user' });
        }
    },

    acceptEula: async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            if (!user || !user.userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            await prisma.user.update({
                where: { id: user.userId },
                data: {
                    eula_accepted_at: new Date()
                }
            });

            res.json({ success: true, message: 'EULA accepted successfully' });
        } catch (error) {
            console.error('acceptEula error:', error);
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
                where: { area_manager_id: user.userId },
                select: { id: true, store_name: true },
                orderBy: { store_name: 'asc' }
            });

            res.json({ success: true, stores });
        } catch (error) {
            console.error('getAreaStores error:', error);
            res.status(500).json({ error: 'Failed to fetch area stores' });
        }
    }
};
