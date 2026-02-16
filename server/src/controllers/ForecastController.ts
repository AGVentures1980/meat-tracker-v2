
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getISOWeek, getYear } from 'date-fns';

const prisma = new PrismaClient();

export class ForecastController {

    /**
     * GET /api/v1/forecast/next-week
     * Returns the forecast for the upcoming week (or current if applicable) via query param date
     */
    static async getForecast(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            let storeId = user?.storeId || 1;

            // Allow Admin/Director to override storeId for Drill-Down awareness
            const queryStoreId = req.query.storeId ? parseInt(req.query.storeId as string) : null;
            if (queryStoreId && (user?.role === 'admin' || user?.role === 'director')) {
                storeId = queryStoreId;
            }

            const { date } = req.query;

            // Logic to determine "Next Week" start date
            // Ideally frontend sends the Monday date string
            if (!date) return res.status(400).json({ error: 'Date required' });

            const forecast = await prisma.salesForecast.findUnique({
                where: {
                    store_id_week_start: {
                        store_id: storeId,
                        week_start: new Date(date as string)
                    }
                }
            });

            return res.json({ success: true, forecast });
        } catch (error) {
            console.error('Get Forecast Error:', error);
            return res.status(500).json({ error: 'Failed to get forecast' });
        }
    }

    /**
     * POST /api/v1/forecast/upsert
     * Creates or Updates a forecast.
     * Enforces Wednesday Lock Rule.
     */
    static async upsertForecast(req: Request, res: Response) {
        try {
            const { week_start, lunch_guests, dinner_guests } = req.body;
            const storeId = (req as any).user?.storeId || 1;
            const userRole = (req as any).user?.role;

            if (!week_start) return res.status(400).json({ error: 'Week Start Date required' });

            const targetWeekStart = new Date(week_start);

            // WEDNESDAY LOCK RULE
            // The input is for "Next Week".
            // We must be BEFORE Wednesday of the CURRENT week to edit Next Week?
            // User Rule: "Me diga... Ate quarta feira da semana anterior ha aquela semana que sera vigente?"
            // Interpretation: Editing Forecast for Week X must happen before Wednesday of Week X-1.

            const now = new Date();
            // Simple check: If 'now' is past Wednesday of the week BEFORE 'targetWeekStart', verify role.

            // Let's calculated the "Lock Deadline"
            // Deadline = Wednesday of the week before targetWeekStart.
            const deadline = new Date(targetWeekStart);
            deadline.setDate(deadline.getDate() - 5); // Monday - 5 days = Previous Wednesday? 
            // Monday (Day 1) - 5 = Wednesday (Day -4)? No.
            // Let's use specific math:
            // Target is Monday (Week N). Previous Monday is Week N-1. Wednesday is previous Monday + 2.
            // So: Target - 7 days + 2 days = Target - 5 days.
            deadline.setHours(23, 59, 59, 999); // End of Wednesday

            const isLocked = now > deadline;

            // Override for Directors/Admins
            if (isLocked && userRole !== 'director' && userRole !== 'admin') {
                return res.status(403).json({
                    error: 'Forecast is LOCKED. Edits required prior to Wednesday of the previous week.',
                    deadline: deadline.toISOString()
                });
            }

            const forecast = await prisma.salesForecast.upsert({
                where: {
                    store_id_week_start: {
                        store_id: storeId,
                        week_start: targetWeekStart
                    }
                },
                update: {
                    forecast_lunch: Number(lunch_guests),
                    forecast_dinner: Number(dinner_guests),
                    // If director edits after lock, we might want to log it or set locked status
                    is_locked: isLocked // If admin edits late, it remains "locked" for managers
                },
                create: {
                    store_id: storeId,
                    week_start: targetWeekStart,
                    forecast_lunch: Number(lunch_guests),
                    forecast_dinner: Number(dinner_guests),
                    is_locked: isLocked // Should be false if created on time
                }
            });

            return res.json({ success: true, forecast });

        } catch (error) {
            console.error('Upsert Forecast Error:', error);
            return res.status(500).json({ error: 'Failed to save forecast' });
        }
    }
}
