import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export const UserController = {
    getStoreUsers: async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            let targetStoreId = user.storeId;

            // Optional query param for Admins to view a specific store's users
            if ((user.role === 'admin' || user.role === 'director') && req.query.storeId) {
                targetStoreId = parseInt(req.query.storeId as string, 10);
            }

            if (!targetStoreId) {
                return res.status(400).json({ error: 'Store ID is required' });
            }

            if (user.role === 'manager' && !user.isPrimary) {
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

            // Optional override for Admins
            if ((currentUser.role === 'admin' || currentUser.role === 'director') && req.body.store_id) {
                targetStoreId = parseInt(req.body.store_id as string, 10);
            }

            if (!targetStoreId) {
                return res.status(400).json({ error: 'Store ID is required' });
            }

            if (currentUser.role === 'manager' && !currentUser.isPrimary) {
                return res.status(403).json({ error: 'Only the primary store account can add team members' });
            }

            const { first_name, last_name, email, password } = req.body;

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
                    store_id: targetStoreId,
                    force_change: true
                },
                select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                    role: true
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
                if (!currentUser.isPrimary) {
                    return res.status(403).json({ error: 'Only the primary store account can delete team members' });
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
    }
};
