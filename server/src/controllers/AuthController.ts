import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { differenceInDays } from 'date-fns';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'brasa-secret-key-change-me';

import { SentinelService } from '../services/SentinelService';

export class AuthController {

    static async login(req: Request, res: Response) {
        try {
            let { email, password, portalCompany } = req.body;
            email = email.toLowerCase().trim();
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

            console.log(`[LOGIN TRACE] email=${email}, role=${user.role}, portalCompany=${portalCompany}`);

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

            // Step 1: Infer company from explicit relations (store_id)
            if (user.store_id) {
                const store = await prisma.store.findUnique({
                    where: { id: user.store_id },
                    select: { company_id: true }
                });
                defaultCompanyId = store?.company_id || null;
            }
            // Step 2: Infer company from area manager relations
            let areaStoreIds: number[] = [];
            if (user.role === 'area_manager') {
                const areaStores = await prisma.store.findMany({
                    where: { area_manager_id: user.id },
                    select: { id: true, company_id: true }
                });
                if (areaStores.length > 0) {
                    defaultCompanyId = areaStores[0].company_id;
                    areaStoreIds = areaStores.map(s => s.id);
                }
            }

            // Step 3: Domain Inference Fallback for Directors/Area Managers/Admins without raw relations
            if (!defaultCompanyId) {
                if (user.email.endsWith('@fogo.com')) {
                    const fdcCompany = await prisma.company.findFirst({ where: { name: { contains: 'Fogo' } } });
                    if (fdcCompany) defaultCompanyId = fdcCompany.id;
                } else if (user.email.endsWith('@texasdebrazil.com')) {
                    const tdbCompany = await prisma.company.findFirst({ where: { name: { contains: 'Texas' } } });
                    if (tdbCompany) defaultCompanyId = tdbCompany.id;
                } else if (user.email.endsWith('@outback.com')) {
                    const outbackCompany = await prisma.company.findFirst({ where: { name: { contains: 'Outback' } } });
                    if (outbackCompany) defaultCompanyId = outbackCompany.id;
                }
            }

            // Step 3.5: Universal Tenant UI Enforcement
            if (user.role !== 'admin' && user.role !== 'partner' && portalCompany && portalCompany !== 'Brasa Meat Intelligence' && defaultCompanyId) {
                const pCompany = await prisma.company.findUnique({ where: { id: defaultCompanyId }, select: { name: true } });
                if (pCompany && pCompany.name !== portalCompany) {
                    return res.status(403).json({ error: `Acesso Negado: Sua conta pertence à organização ${pCompany.name}. Por favor, acesse através do seu portal correto.` });
                }
            }

            // Step 4: Define Scope Object
            let scope: any = { type: 'UNKNOWN' };
            if (user.role === 'admin') scope = { type: 'GLOBAL' };
            else if (user.role === 'director') scope = { type: 'COMPANY', companyId: defaultCompanyId };
            else if (user.role === 'area_manager') scope = { type: 'AREA', storeIds: areaStoreIds };
            else if (user.role === 'partner') scope = { type: 'PARTNER' };
            else if (user.store_id) scope = { type: 'STORE', storeId: user.store_id };

            // Route user depending on Role
            if (user.role === 'admin') {
                redirectPath = '/select-company'; // Admin always picks
            } else if (user.role === 'partner') {
                redirectPath = '/partner';
            } else {
                redirectPath = '/dashboard'; // Make Dashboard the standard Global Anchor Page!
            }

            // 4. Issue Token
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    role: user.role,
                    storeId: user.store_id,
                    companyId: defaultCompanyId, // Strict Tenant Enforcement
                    scope, // Injected Hierarchical Scope

                    isPrimary: user.is_primary,
                    eula_accepted: !!user.eula_accepted_at,
                    position: user.position,
                    firstName: user.first_name,
                    lastName: user.last_name
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
                    scope, // Ensure frontend knows its scope boundary
                    isPrimary: user.is_primary,
                    eula_accepted: !!user.eula_accepted_at,
                    position: user.position,
                    firstName: user.first_name,
                    lastName: user.last_name
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

    static async forgotPassword(req: Request, res: Response) {
        try {
            const { email } = req.body;
            if (!email) return res.status(400).json({ error: 'Email is required' });

            const user = await prisma.user.findUnique({
                where: { email: email.toLowerCase() }
            });

            if (!user) {
                // Don't leak whether the email exists, just return success
                return res.json({ success: true, message: 'If the email exists, an OTP was sent.' });
            }

            // Generate 4 digit OTP
            const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

            // Store in SystemSettings
            const key = `otp_reset_${user.email}`;
            const value = JSON.stringify({ code: otpCode, expiresAt: expiresAt.toISOString() });

            await prisma.systemSettings.upsert({
                where: { key },
                update: { value, type: 'otp_code' },
                create: { key, value, type: 'otp_code' }
            });

            // Send via EmailJS REST API from backend for security
            const emailjsPayload = {
                service_id: "service_v5fsxwr",
                template_id: "4mq0hxz",
                user_id: "15yzEVB4O5kIXWLUS",
                template_params: {
                    to_email: user.email,
                    subject: "Brasa Meat Intelligence - Secure Password Reset",
                    message: `Your critical security OTP for password recovery is: ${otpCode}. This code is strictly confidential and expires in 15 minutes.`,
                    otp_code: otpCode
                }
            };

            const emailRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(emailjsPayload)
            });

            if (!emailRes.ok) {
                console.error("EmailJS backend send failed:", await emailRes.text());
                return res.status(500).json({ error: 'Failed to send OTP email.' });
            }

            return res.json({ success: true, message: 'If the email exists, an OTP was sent.' });
        } catch (error) {
            console.error('Forgot Password Error:', error);
            return res.status(500).json({ error: 'Failed to process request' });
        }
    }

    static async resetPasswordWithOtp(req: Request, res: Response) {
        try {
            const { email, otp, newPassword } = req.body;
            if (!email || !otp || !newPassword) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            if (newPassword.length < 8) {
                return res.status(400).json({ error: 'Password must be at least 8 characters' });
            }

            const cleanEmail = email.toLowerCase();
            const key = `otp_reset_${cleanEmail}`;

            const setting = await prisma.systemSettings.findUnique({
                where: { key }
            });

            if (!setting) {
                return res.status(400).json({ error: 'Invalid or expired OTP' });
            }

            const data = JSON.parse(setting.value);

            if (data.code !== otp.trim()) {
                // To prevent brute force, we could log attempts, but for MVP:
                return res.status(400).json({ error: 'Invalid OTP' });
            }

            if (new Date() > new Date(data.expiresAt)) {
                await prisma.systemSettings.delete({ where: { key } });
                return res.status(400).json({ error: 'OTP has expired. Request a new one.' });
            }

            // OTP is valid!
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            await prisma.user.update({
                where: { email: cleanEmail },
                data: {
                    password_hash: hashedPassword,
                    last_password_change: new Date(),
                    force_change: false
                }
            });

            // Consume OTP
            await prisma.systemSettings.delete({ where: { key } });

            return res.json({ success: true, message: 'Password updated successfully' });

        } catch (error) {
            console.error('Reset Password OTP Error:', error);
            return res.status(500).json({ error: 'Failed to reset password' });
        }
    }
}
