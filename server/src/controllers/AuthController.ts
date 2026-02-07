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
}
