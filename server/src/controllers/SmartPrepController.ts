
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { MEAT_UNIT_WEIGHTS } from '../config/meat_weights';
import { MEAT_STANDARDS } from '../config/standards'; // Fallback

const prisma = new PrismaClient();

export class SmartPrepController {

    static async getDailyPrep(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId;
            // @ts-ignore
            const userRole = req.user.role;
            // @ts-ignore
            const userStoreId = req.user.store_id || 1; // Default to Dallas if null (Admin fallback)

            // 1. Determine Store ID
            let storeId = userStoreId;
            if ((userRole === 'admin' || userRole === 'director')) {
                if (req.query.store_id) {
                    storeId = parseInt(req.query.store_id as string);
                } else {
                    storeId = 1; // Explicit default for Admin view
                }
            }

            // 2. Determine Date
            const dateStr = req.query.date as string || new Date().toISOString().split('T')[0];
            const date = new Date(dateStr);
            const dayOfWeek = date.getDay(); // 0 = Sun

            // 2.5 Check if Locked
            const savedLog = await prisma.prepLog.findUnique({
                where: {
                    store_id_date: {
                        store_id: storeId,
                        date: date
                    }
                }
            });

            if (savedLog) {
                // Return saved data
                const store = await prisma.store.findUnique({
                    where: { id: storeId }
                });
                return res.json({
                    store_name: store?.store_name || 'Store',
                    date: dateStr,
                    forecast_guests: savedLog.forecast,
                    ...(savedLog.data as any),
                    is_locked: true,
                    locked_by: savedLog.user_id,
                    locked_at: savedLog.created_at
                });
            }

            // 3. Get Store & Target Settings
            // Check schema to ensure 'meat_targets' exists. Passively handling it if not.
            const store = await prisma.store.findUnique({
                where: { id: storeId },
                include: { meat_targets: true }
            });

            if (!store) return res.status(404).json({ error: 'Store not found' });

            // Store-level target (Lbs/Guest)
            // Hardcoded override logic from Phase 24 retained for reliability
            const TARGET_OVERRIDES: Record<number, number> = {
                1: 1.76, // Dallas
                2: 1.85, // Austin
                3: 1.95, // NYC
                4: 1.65, // Miami
                5: 2.10  // Vegas
            };
            const targetLbsPerGuest = TARGET_OVERRIDES[storeId] || store.target_lbs_guest || 1.76;

            // 4. Determine Forecast
            let forecast = 150; // default
            if (req.query.guests) {
                // Manual override
                forecast = parseInt(req.query.guests as string);
            } else {
                // Mock smart forecast logic
                // In Phase 26, we simulate "Smart" prediction based on day of week
                const baseForecast = 120;
                forecast = baseForecast + (dayOfWeek * 25); // Fri/Sat will be higher
            }

            // 5. Calculate Prep
            const totalMeatLbs = forecast * targetLbsPerGuest;
            const prepList = [];
            const proteins = Object.keys(MEAT_UNIT_WEIGHTS);

            for (const protein of proteins) {
                let mixPercentage = 0;

                // Check for specific protein override in DB
                const specificOverride = store.meat_targets.find(t => t.protein === protein);

                if (specificOverride) {
                    mixPercentage = specificOverride.target / targetLbsPerGuest;
                } else {
                    // Fallback to standards
                    const stdVal = MEAT_STANDARDS[protein] || 0;
                    mixPercentage = stdVal / 1.76; // Normalize to standard yield
                }

                const neededLbs = totalMeatLbs * mixPercentage;
                const unitWeight = MEAT_UNIT_WEIGHTS[protein] || 1;
                const neededUnits = neededLbs / unitWeight;

                prepList.push({
                    protein,
                    unit_name: 'Piece/Whole',
                    avg_weight: unitWeight,
                    mix_percentage: (mixPercentage * 100).toFixed(1) + '%',
                    recommended_lbs: parseFloat(neededLbs.toFixed(2)),
                    recommended_units: Math.round(neededUnits * 10) / 10
                });
            }

            // Sort by Volume
            prepList.sort((a, b) => b.recommended_lbs - a.recommended_lbs);

            return res.json({
                store_name: store.store_name,
                date: dateStr,
                forecast_guests: forecast,
                target_lbs_guest: targetLbsPerGuest,
                prep_list: prepList
            });

        } catch (error) {
            console.error('Smart Prep Error:', error);
            // Return a safe fallback if DB fails so UI doesn't crash
            return res.status(500).json({ error: 'Failed to generate prep list' });
        }
    }

    static async lockPrepPlan(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId;
            const { store_id, date, forecast, data } = req.body;

            if (!store_id || !date || !forecast || !data) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const existing = await prisma.prepLog.findUnique({
                where: {
                    store_id_date: {
                        store_id: parseInt(store_id),
                        date: new Date(date)
                    }
                }
            });

            if (existing) {
                return res.status(400).json({ error: 'This day is already locked for this store.' });
            }

            await prisma.prepLog.create({
                data: {
                    store_id: parseInt(store_id),
                    date: new Date(date),
                    forecast: parseInt(forecast),
                    data: { prep_list: data.prep_list, target_lbs_guest: data.target_lbs_guest },
                    user_id: userId
                }
            });

            res.json({ success: true });
        } catch (error) {
            console.error('Lock Prep Error:', error);
            res.status(500).json({ error: 'Failed to lock prep plan' });
        }
    }
}
