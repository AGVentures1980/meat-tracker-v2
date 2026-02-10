
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class WasteController {

    static async getStatus(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userStoreId = req.user?.storeId || req.user?.store_id || 1;
            let storeId = userStoreId;

            // @ts-ignore
            console.log(`[WasteStatus] Fetching for store: ${storeId} (User role: ${(req as any).user?.role})`);

            // Allow Admin/Director override
            // @ts-ignore
            if (((req as any).user?.role === 'admin' || (req as any).user?.role === 'director') && req.query.store_id) {
                storeId = parseInt(req.query.store_id as string);
                console.log(`[WasteStatus] Admin override to store: ${storeId}`);
            }

            const today = new Date();
            const centralDate = this.getCentralDateTime(today);
            const dateStr = centralDate.toISOString().split('T')[0];
            console.log(`[WasteStatus] Business Date: ${dateStr}`);

            const startOfWeek = new Date(centralDate);
            const day = startOfWeek.getDay() || 7; // Get current day number, converting Sun(0) to 7 if needed
            if (day !== 1) startOfWeek.setDate(startOfWeek.getDate() - (day - 1)); // Set to Monday
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
            console.log(`[WasteStatus] Found ${todaysLogs.length} logs for today.`);

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

            const centralNow = this.getCentralDateTime(today);
            const currentWindow = this.getShiftWindow(centralNow);

            if (compliance.is_locked) {
                canInputLunch = false;
                canInputDinner = false;
                statusMessage = "LOCKED: Weekly Quota Missed. Contact Director.";
            } else if (hasLunch || hasDinner) {
                canInputLunch = false;
                canInputDinner = false;
                statusMessage = `Completed for Today (${hasLunch ? 'Lunch' : 'Dinner'} Logged). Resume Tomorrow.`;
            } else if (currentWindow === 'CLOSED') {
                canInputLunch = false;
                canInputDinner = false;
                statusMessage = "System is outside of input hours. Store is currently closed for waste logs.";
            } else {
                if (currentWindow === 'LUNCH') {
                    canInputLunch = true;
                    canInputDinner = false;
                    statusMessage = "Lunch shift is open for waste entry.";
                } else if (currentWindow === 'DINNER') {
                    canInputLunch = false;
                    canInputDinner = true;
                    statusMessage = "Dinner shift is open for waste entry.";
                } else if (currentWindow === 'ANY') {
                    canInputLunch = true;
                    canInputDinner = true;
                    statusMessage = "Store is open (All Day). Choose either shift to log.";
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
            res.status(500).json({
                error: 'Failed to fetch waste status',
                details: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });
        }
    }

    static async logWaste(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user?.userId;
            // @ts-ignore
            const userRole = req.user?.role;
            // @ts-ignore
            let userStoreId = req.user?.storeId || req.user?.store_id || 1;

            const { shift, items, date, store_id } = req.body; // items: [{protein, weight, reason}]

            // Admin Override
            if ((userRole === 'admin' || userRole === 'director') && store_id) {
                userStoreId = parseInt(store_id);
            }
            const centralNow = this.getCentralDateTime(new Date());
            const logDate = new Date(date || centralNow.toISOString().split('T')[0]);

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
            const centralDate = this.getCentralDateTime(new Date());
            const startOfWeek = new Date(centralDate);
            const day = startOfWeek.getDay() || 7;
            if (day !== 1) startOfWeek.setDate(startOfWeek.getDate() - (day - 1));
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

    private static getShiftWindow(centralTime: Date) {
        // Force Central Time (CST) for Brasa Operations (Dallas/Austin base)
        // EST is -5, CST is -6. We'll use -6 as the baseline for the "The Garcia Rule".
        const day = centralTime.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
        const hour = centralTime.getHours();
        const minute = centralTime.getMinutes();
        const currentTime = hour + minute / 60;

        // Saturday (6)
        if (day === 6) {
            if (currentTime >= 11 && currentTime < 23.5) return 'ANY';
            return 'CLOSED';
        }
        // Sunday (0)
        if (day === 0) {
            if (currentTime >= 11 && currentTime < 21) return 'ANY';
            return 'CLOSED';
        }

        // Friday (5)
        if (day === 5) {
            if (currentTime >= 11 && currentTime < 14) return 'LUNCH';
            if (currentTime >= 17 && currentTime < 23.5) return 'DINNER';
            return 'CLOSED';
        }

        // Mon-Thu (1, 2, 3, 4)
        if (day >= 1 && day <= 4) {
            if (currentTime >= 11 && currentTime < 14) return 'LUNCH';
            if (currentTime >= 17 && currentTime < 21.5) return 'DINNER';
            return 'CLOSED';
        }

        return 'CLOSED';
    }

    private static getCentralDateTime(now: Date): Date {
        // CST (Central Standard Time) is UTC-6. 
        // CDT (Central Daylight Time) is UTC-5.
        // For simplicity and matching Brasa operational baseline: force UTC-6.
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        return new Date(utc + (3600000 * -6));
    }
}
