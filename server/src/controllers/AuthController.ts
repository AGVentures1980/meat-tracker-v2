import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { differenceInDays } from 'date-fns';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'brasa-secret-key-change-me';

export class AuthController {

    static async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;

            // 1. Find User
            const user = await prisma.user.findUnique({
                where: { email }
            });

            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // check if trial has expired
            if (user.is_trial && user.trial_expires_at) {
                if (new Date() > new Date(user.trial_expires_at)) {
                    return res.status(403).json({
                        error: 'Trial Expired',
                        message: 'Your 30-day trial has ended. Please contact Alex Garcia Ventures for enterprise access.'
                    });
                }
            }

            // 2. Verify Password
            const valid = await bcrypt.compare(password, user.password_hash);
            if (!valid) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // 3. Security Checks
            let forcePasswordChange = user.force_change;

            // Check Rotation Policy (90 days)
            const daysSinceChange = differenceInDays(new Date(), user.last_password_change);
            if (daysSinceChange >= 90) {
                forcePasswordChange = true;
            }

            // 4. Issue Token
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    role: user.role,
                    storeId: user.store_id
                },
                JWT_SECRET,
                { expiresIn: '12h' } // Shifts are long
            );

            // 5. Return
            return res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    storeId: user.store_id
                },
                forcePasswordChange
            });

        } catch (error) {
            console.error('Login Error:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    static async changePassword(req: Request, res: Response) {
        try {
            const userId = (req as any).user.userId; // From JWT
            const { newPassword } = req.body;

            if (!newPassword || newPassword.length < 8) {
                return res.status(400).json({ error: 'Password must be at least 8 characters' });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);

            await prisma.user.update({
                where: { id: userId },
                data: {
                    password_hash: hashedPassword,
                    last_password_change: new Date(),
                    force_change: false
                }
            });

            return res.json({ success: true, message: 'Password updated successfully' });

        } catch (error) {
            console.error('Change Password Error:', error);
            return res.status(500).json({ error: 'Failed to update password' });
        }
    }

    static async requestDemo(req: Request, res: Response) {
        try {
            const { email } = req.body;

            if (!email || !email.includes('@')) {
                return res.status(400).json({ error: 'Valid email is required' });
            }

            // Check if user already exists
            const existingUser = await prisma.user.findUnique({
                where: { email }
            });

            if (existingUser) {
                return res.status(400).json({ error: 'Email already registered for demo or access' });
            }

            // Create Trial User
            // For Demo, we'll assign them a default store (e.g., Store ID 1) or create a "Demo Store"
            // For simplicity, assigning to Store 1 (Dallas) but marked as Trial
            const trialPassword = Math.random().toString(36).slice(-8); // Generate random temp password
            const hashedPassword = await bcrypt.hash(trialPassword, 10);
            const expiration = new Date();
            expiration.setDate(expiration.getDate() + 30);

            const user = await prisma.user.create({
                data: {
                    email,
                    password_hash: hashedPassword,
                    role: 'viewer', // Trials are viewers by default
                    is_trial: true,
                    trial_expires_at: expiration,
                    store_id: 1, // Dallas as demo store
                    force_change: true // Force them to set their own password on first login
                }
            });

            // In a real app, we'd send an email here.
            // For now, return the temporary credentials (simulating the email delivery)
            return res.json({
                success: true,
                message: '30-day Demo Access Granted!',
                details: 'In a real SaaS, credentials would be sent to your email. For this demo simulation, use the credentials below.',
                tempCredentials: {
                    email: user.email,
                    password: trialPassword
                },
                expiresAt: expiration
            });

        } catch (error) {
            console.error('Request Demo Error:', error);
            return res.status(500).json({ error: 'Failed to generate demo access' });
        }
    }
}
