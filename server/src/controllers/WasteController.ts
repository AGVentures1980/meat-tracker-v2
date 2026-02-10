
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class WasteController {

    static async getStatus(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userStoreId = req.user.store_id || 1; // Default to 1 if not set
            let storeId = userStoreId;

            // Allow Admin/Director override
            // @ts-ignore
            if ((req.user.role === 'admin' || req.user.role === 'director') && req.query.store_id) {
                storeId = parseInt(req.query.store_id as string);
            }

            const today = new Date();
            const dateStr = today.toISOString().split('T')[0];
            const startOfWeek = new Date(today);
            const day = startOfWeek.getDay() || 7; // Get current day number, converting Sun(0) to 7 if needed
            if (day !== 1) startOfWeek.setHours(-24 * (day - 1)); // Set to Monday
            startOfWeek.setHours(0, 0, 0, 0);


            // 1. Check Compliance Status (Lockout)
            let compliance = await prisma.wasteCompliance.findUnique({
                where: {
                    store_id_week_start: {
                        store_id: storeId,
                        week_start: startOfWeek
                    }
                }
            });

            if (!compliance) {
                // Initialize if not exists
                compliance = await prisma.wasteCompliance.create({
                    data: {
                        store_id: storeId,
                        week_start: startOfWeek
                    }
                });
            }

            // 2. Check Today's Logs for Alternating Rule
            const todaysLogs = await prisma.wasteLog.findMany({
                where: {
                    store_id: storeId,
                    date: new Date(dateStr)
                }
            });

            const hasLunch = todaysLogs.some(log => log.shift === 'LUNCH');
            const hasDinner = todaysLogs.some(log => log.shift === 'DINNER');

            // 3. Determine Input Availability
            // If Locked -> Block All
            // If Lunch done -> Block Lunch, Allow Dinner ONLY IF Dinner not done (Wait, rule is ALTERNATING)
            // THE GARCIA RULE: "If LUNCH is input today, he cannot put waste for dinner TODAY"
            // Implementation: If ANY log exists for today, block the OTHER shift. 
            // Actually, if ANY log exists today, block ALL further inputs for today? 
            // "if he inputs waste for LUNCH today he cannot put waste for dinner TODAY" -> Implies 1 input per day max?
            // "totalizing 6 inputs weekly being 3 dinners and 3 lunches" -> 6 inputs / 7 days. 
            // This implies 1 input per day, alternating. 
            // So if I do Lunch Mon, I must do Dinner Tue? Or can I do Dinner Mon if I didn't do Lunch?
            // "3x Lunch and 3x Dinner per week in ALTERNATE DAYS"
            // So: Mon(Lunch), Tue(Dinner), Wed(Lunch), Thu(Dinner), Fri(Lunch), Sat(Dinner), Sun(Off/Catchup?)

            let canInputLunch = !compliance.is_locked;
            let canInputDinner = !compliance.is_locked;
            let statusMessage = "Open for Entry";

            if (compliance.is_locked) {
                canInputLunch = false;
                canInputDinner = false;
                statusMessage = "LOCKED: Weekly Quota Missed. Contact Director.";
            } else {
                if (hasLunch) {
                    canInputLunch = false; // Already done
                    canInputDinner = false; // Blocked by Garcia Rule (1 shift per day)
                    statusMessage = "Completed for Today (Lunch Logged). Resume Tomorrow.";
                } else if (hasDinner) {
                    canInputLunch = false; // Blocked by Garcia Rule
                    canInputDinner = false; // Already done
                    statusMessage = "Completed for Today (Dinner Logged). Resume Tomorrow.";
                }
            }

            // 4. Calculate Global Waste Analysis (The Fair Formula)
            // Waste % = Total Waste Lbs / (Forecast Guests * Store Specific Target)

            // Fetch Store Target
            const store = await prisma.store.findUnique({
                where: { id: storeId }
            });
            const storeTarget = store?.target_lbs_guest || 1.76; // Fallback to 1.76 if missing
            const forecastGuests = 150; // Mock forecast for now
            const totalProjectedUsage = forecastGuests * storeTarget;

            // Group waste by Reason (for Breakdown) and Sum Total
            let totalWasteLbs = 0;
            const wasteByReason: Record<string, number> = {};
            const wasteByProtein: Record<string, number> = {};

            todaysLogs.forEach(log => {
                const items = log.items as any[];
                items.forEach(item => {
                    totalWasteLbs += item.weight;

                    // Sum by Reason
                    wasteByReason[item.reason] = (wasteByReason[item.reason] || 0) + item.weight;
                    // Sum by Protein (for list)
                    wasteByProtein[item.protein] = (wasteByProtein[item.protein] || 0) + item.weight;
                });
            });

            // Calculate Global %
            // Avoid divide by zero
            const safeProjection = totalProjectedUsage < 1 ? 100 : totalProjectedUsage;
            const globalWastePercent = (totalWasteLbs / safeProjection) * 100;

            const THRESHOLD_PERCENT = 5.0; // 5%
            const isHighWaste = globalWastePercent > THRESHOLD_PERCENT;

            // Format Breakdown for UI
            const breakdown = Object.entries(wasteByReason)
                .map(([reason, lbs]) => ({ reason, lbs, percent: (lbs / totalWasteLbs) * 100 }))
                .sort((a, b) => b.lbs - a.lbs);

            res.json({
                week_start: startOfWeek,
                compliance: {
                    lunch_count: compliance.lunch_count,
                    dinner_count: compliance.dinner_count,
                    is_locked: compliance.is_locked
                },
                today: {
                    has_lunch: hasLunch,
                    has_dinner: hasDinner,
                    can_input_lunch: canInputLunch,
                    can_input_dinner: canInputDinner,
                    message: statusMessage
                },
                analysis: {
                    total_waste_lbs: totalWasteLbs.toFixed(1),
                    projected_usage: safeProjection.toFixed(1),
                    store_target: storeTarget,
                    global_percent: globalWastePercent.toFixed(2),
                    is_critical: isHighWaste,
                    breakdown: breakdown
                }
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch waste status' });
        }
    }

    static async logWaste(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId;
            // @ts-ignore
            const userStoreId = req.user.store_id || 1;

            const { shift, items, date } = req.body; // items: [{protein, weight, reason}]
            const logDate = new Date(date || new Date().toISOString().split('T')[0]);

            // 1. Validate The Garcia Rule (Server Side Enforcement)
            const existingLogs = await prisma.wasteLog.findMany({
                where: {
                    store_id: userStoreId,
                    date: logDate
                }
            });

            if (existingLogs.length > 0) {
                return res.status(400).json({ error: "Daily Limit Reached. Only one shift per day is allowed." });
            }

            // 2. Create Log
            await prisma.wasteLog.create({
                data: {
                    store_id: userStoreId,
                    date: logDate,
                    shift: shift,
                    input_by: 'Manager', // Todo: Get name from user
                    user_id: userId,
                    items: items
                }
            });

            // 3. Update Compliance Counters
            // Find current week compliance
            const today = new Date();
            const startOfWeek = new Date(today);
            const day = startOfWeek.getDay() || 7;
            if (day !== 1) startOfWeek.setHours(-24 * (day - 1));
            startOfWeek.setHours(0, 0, 0, 0);

            const compliance = await prisma.wasteCompliance.findUnique({
                where: {
                    store_id_week_start: {
                        store_id: userStoreId,
                        week_start: startOfWeek
                    }
                }
            });

            if (compliance) {
                await prisma.wasteCompliance.update({
                    where: { id: compliance.id },
                    data: {
                        lunch_count: shift === 'LUNCH' ? { increment: 1 } : undefined,
                        dinner_count: shift === 'DINNER' ? { increment: 1 } : undefined
                    }
                });
            } else {
                await prisma.wasteCompliance.create({
                    data: {
                        store_id: userStoreId,
                        week_start: startOfWeek,
                        lunch_count: shift === 'LUNCH' ? 1 : 0,
                        dinner_count: shift === 'DINNER' ? 1 : 0
                    }
                });
            }

            res.json({ success: true });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to log waste' });
        }
    }
}
