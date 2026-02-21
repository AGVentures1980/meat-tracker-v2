import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { differenceInDays } from 'date-fns';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'brasa-secret-key-change-me';

import { SentinelService } from '../services/SentinelService';

export class AuthController {

    static async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;
            const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

            // 1. Find User
            const user = await prisma.user.findUnique({
                where: { email }
            });

            if (!user) {
                await SentinelService.trackAttempt(clientIp);
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
                await SentinelService.trackAttempt(clientIp);
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Success - Reset Sentinel
            SentinelService.reset(clientIp);

            // 3. Security Checks
            let forcePasswordChange = user.force_change;

            // Check Rotation Policy (90 days)
            const daysSinceChange = differenceInDays(new Date(), user.last_password_change);
            if (daysSinceChange >= 90) {
                forcePasswordChange = true;
            }

            // 5. Calculate Redirect and Default Company
            let redirectPath = '/dashboard';
            let defaultCompanyId = null;

            if (user.role === 'admin') {
                redirectPath = '/select-company';
            } else if (user.role === 'director' || user.email === 'dallas@texasdebrazil.com') {
                // Find companies affiliated with this director
                const affiliatedCompanies = await prisma.company.findMany({
                    where: {
                        OR: [
                            { owner_id: user.id },
                            { stores: { some: { id: user.store_id || -1 } } },
                            { id: 'tdb-main' } // Explicit fallback for TDB director accounts
                        ]
                    },
                    select: { id: true }
                });

                if (affiliatedCompanies.length >= 1) {
                    redirectPath = '/executive';
                    defaultCompanyId = affiliatedCompanies[0].id;
                } else {
                    redirectPath = '/select-company';
                }
            } else {
                // Manager/Viewer
                if (user.store_id) {
                    const store = await prisma.store.findUnique({
                        where: { id: user.store_id },
                        select: { company_id: true }
                    });
                    defaultCompanyId = store?.company_id || null;
                }
                redirectPath = '/dashboard';
            }

            // 4. Issue Token (RE-ORDERED TO HAVE CompanyID)
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    role: user.role,
                    storeId: user.store_id,
                    companyId: defaultCompanyId || 'tdb-main', // Fallback for TDB safety
                    isPrimary: user.is_primary
                },
                JWT_SECRET,
                { expiresIn: '12h' }
            );

            // 6. Return
            return res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    storeId: user.store_id,
                    companyId: defaultCompanyId || 'tdb-main',
                    isPrimary: user.is_primary
                },
                redirectPath,
                defaultCompanyId,
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
            // Assign to Demo Playground (isolated from real client data)
            const demoCompany = await prisma.company.findUnique({
                where: { id: 'demo-playground-agv' }
            });

            if (!demoCompany) {
                return res.status(500).json({
                    error: 'Demo environment not initialized. Please contact support.'
                });
            }

            // Get first demo store
            const demoStore = await prisma.store.findFirst({
                where: { company_id: demoCompany.id }
            });

            if (!demoStore) {
                return res.status(500).json({
                    error: 'Demo stores not available. Please contact support.'
                });
            }

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
                    store_id: demoStore.id, // Assign to Demo Store (isolated)
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
