
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { MEAT_UNIT_WEIGHTS } from '../config/meat_weights';
import { MEAT_STANDARDS } from '../config/standards'; // Fallback

const prisma = new PrismaClient();

export class SmartPrepController {

    static async getNetworkPrepStatus(req: Request, res: Response) {
        try {
            // 1. Determine Date (Force Central Time - Business Date)
            const today = new Date();
            const centralNow = SmartPrepController.getCentralDateTime(today);
            const dateStr = req.query.date as string || centralNow.toISOString().split('T')[0];
            const date = new Date(dateStr);

            // 2. Fetch all stores
            const stores = await prisma.store.findMany({
                select: {
                    id: true,
                    store_name: true,
                    location: true
                },
                orderBy: { store_name: 'asc' }
            });

            // 3. Fetch all prep logs for this date
            const logs = await (prisma as any).prepLog.findMany({
                where: { date: date },
                select: {
                    store_id: true,
                    forecast: true,
                    created_at: true
                }
            });

            // 4. Map stores to their status
            const statusGrid = stores.map(store => {
                const log = logs.find((l: any) => l.store_id === store.id);
                return {
                    id: store.id,
                    name: store.store_name,
                    location: store.location,
                    is_locked: !!log,
                    forecast: log ? log.forecast : null,
                    submitted_at: log ? log.created_at : null
                };
            });

            return res.json({
                date: dateStr,
                total_stores: stores.length,
                submitted_count: logs.length,
                stores: statusGrid
            });

        } catch (error) {
            console.error('Network Prep Status Error:', error);
            return res.status(500).json({ error: 'Failed to fetch network prep status' });
        }
    }

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
            const today = new Date();
            const centralNow = SmartPrepController.getCentralDateTime(today);
            const dateStr = req.query.date as string || centralNow.toISOString().split('T')[0];
            const date = new Date(dateStr);
            const dayOfWeek = date.getDay(); // 0 = Sun

            // 2.5 Check if Locked
            const savedLog = await (prisma as any).prepLog.findUnique({
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

            // 5. Calculate Prep (Efficiency Target Logic v2.8)
            const totalMeatLbs = forecast * targetLbsPerGuest;
            const prepList = [];
            const proteins = Object.keys(MEAT_UNIT_WEIGHTS);

            for (const protein of proteins) {
                let mixPercentage = 0;

                // Check for specific protein override in DB
                const meatTargets = (store as any).meat_targets || [];
                const specificOverride = meatTargets.find((t: any) => t.protein === protein);

                if (specificOverride) {
                    mixPercentage = specificOverride.target / targetLbsPerGuest;
                } else {
                    // Fallback to standards
                    const stdVal = MEAT_STANDARDS[protein] || 0;
                    mixPercentage = stdVal / 1.76; // Normalize to standard yield
                }

                const neededLbs = totalMeatLbs * mixPercentage;

                // DYNAMIC SKEWER LOGIC (v2.8)
                let unitWeight = MEAT_UNIT_WEIGHTS[protein] || 1;
                let unitName = 'Piece/Whole';

                if (protein === 'Chicken Breast') {
                    const piecesPerSkewer = forecast > 400 ? 10 : 9;
                    unitWeight = (piecesPerSkewer * 0.125) / 0.95;
                    unitName = 'Skewers';
                } else if (protein.includes('Filet') || protein.includes('Tenderloin')) {
                    unitWeight = 2.0; // 10 pieces ~3oz each
                    unitName = 'Skewers';
                } else if (protein === 'Sausage') {
                    unitWeight = 2.4; // 12 pieces
                    unitName = 'Skewers';
                } else if (protein === 'Chicken Drumstick') {
                    unitWeight = 2.5; // 10 pieces
                    unitName = 'Skewers';
                } else if (protein.includes('Picanha')) {
                    // Beef or Picanha sub-types
                    unitWeight = protein.includes('Lamb') ? 1.5 : 3.5;
                    unitName = 'Skewers';
                } else if (protein === 'Lamb Chops') {
                    unitWeight = 1.6; // 8 pieces @ 0.2lb
                    unitName = 'Skewers';
                } else if (protein.includes('Pork Loin')) {
                    unitWeight = 1.8; // 12 pieces (Parmesan Pork)
                    unitName = 'Skewers';
                } else if (protein.includes('Ribs')) {
                    // Beef Ribs (~4lb) or Pork Ribs (~3lb slab)
                    unitWeight = protein.includes('Beef') ? 4.0 : 3.0;
                    unitName = protein.includes('Beef') ? 'Ribs' : 'Skewers';
                } else if (protein.includes('Fraldinha') || protein.includes('Flap')) {
                    unitWeight = 2.5; // Whole piece
                    unitName = 'Skewers';
                } else if (protein.includes('Leg of Lamb')) {
                    unitWeight = 4.0; // Whole leg / Large pieces
                    unitName = 'Skewers';
                } else if (unitWeight > 1.5) {
                    unitName = 'Skewers';
                }

                const neededUnits = neededLbs / unitWeight;

                prepList.push({
                    protein,
                    unit_name: unitName,
                    avg_weight: parseFloat(unitWeight.toFixed(2)),
                    mix_percentage: (mixPercentage * 100).toFixed(1) + '%',
                    recommended_lbs: parseFloat(neededLbs.toFixed(2)),
                    recommended_units: Math.ceil(neededUnits) // Butchers don't prep partial skewers
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

            await (prisma as any).prepLog.create({
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

    private static getCentralDateTime(now: Date): Date {
        // CST (Central Standard Time) is UTC-6. 
        // CDT (Central Daylight Time) is UTC-5.
        // For simplicity and matching Brasa operational baseline: force UTC-6.
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        return new Date(utc + (3600000 * -6));
    }
}
