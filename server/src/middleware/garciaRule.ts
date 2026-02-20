import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// The Garcia Rule: Weekly Inventory Lockout Middleware (Sunday 10PM - Monday 11AM)
// If the store hasn't submitted their weekly inventory by Monday 11AM, 
// block access to the operational dashboard until compliance is met.
export const enforceGarciaRule = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;
        if (!user || user.role === 'admin' || user.role === 'director') {
            return next(); // Admins/Directors skip the lock
        }

        const storeId = user.storeId;
        if (!storeId) {
            return next();
        }

        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday
        const hour = now.getHours();

        // Check if we are in the enforcement window (Monday 11AM to Monday 11:59PM as an example)
        // Practically: If today is Monday, and time is > 11:00 AM, enforce
        if (dayOfWeek === 1 && hour >= 11) {

            // Check if there is a WEEKLY InventoryCycle submitted between Sunday 22:00 and Now
            const sundayNight = new Date(now);
            sundayNight.setDate(now.getDate() - 1);
            sundayNight.setHours(22, 0, 0, 0);

            const inventory = await prisma.inventoryCycle.findFirst({
                where: {
                    store_id: storeId,
                    cycle_type: 'WEEKLY',
                    status: 'SUBMITTED',
                    submitted_at: {
                        gte: sundayNight
                    }
                }
            });

            if (!inventory) {
                return res.status(403).json({
                    error: 'GARCIA_RULE_LOCKOUT',
                    message: 'Weekly Smart Inventory is pending. Plase complete your inventory count for Core Proteins (Vilões) to unlock the system.'
                });
            }
        }

        next();
    } catch (error) {
        console.error('[Middleware] Garcia Rule Error:', error);
        next(); // Fail open on db error to not break the system entirely
    }
};
