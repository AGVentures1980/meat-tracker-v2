
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const VILLAINS = ['Picanha', 'Picanha with Garlic', 'Lamb Picanha', 'Beef Ribs', 'Lamb Chops', 'Filet Mignon', 'Filet Mignon with Bacon', 'Fraldinha', 'Flap Steak'];

export class WasteController {

    static async getStatus(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userStoreId = req.user?.storeId || req.user?.store_id || 1;
            let storeId = userStoreId;

            const today = new Date();
            const centralNow = WasteController.getCentralDateTime(today);
            const dateStr = centralNow.toISOString().split('T')[0];

            // --- ACCOUNTABILITY GATE (OZ PRINCIPLE) ---
            const hasAccountability = await WasteController.checkAccountabilityGate(storeId, dateStr);

            if (!hasAccountability) {
                return res.json({
                    gate_locked: true,
                    message: "Accountability Gate Locked: Invoice input or 'No Delivery Today' flag required for today's shift.",
                    required_action: "/prices"
                });
            }

            const startOfWeek = new Date(centralNow);
            const day = startOfWeek.getDay() || 7; // Get current day number, converting Sun(0) to 7 if needed
            if (day !== 1) startOfWeek.setDate(startOfWeek.getDate() - (day - 1)); // Set to Monday
            startOfWeek.setHours(0, 0, 0, 0);

            // 0. Validate Store Exists (Prevent Crash on "Las Vegas" etc)
            const storeExists = await prisma.store.findUnique({ where: { id: storeId } });
            if (!storeExists) {
                return res.json({
                    error: "Store Connection Pending",
                    details: "This store has not been provisioned in the database yet.",
                    week_start: startOfWeek,
                    compliance: { lunch_count: 0, dinner_count: 0, is_locked: true }, // Lock it safe
                    today: { has_lunch: false, has_dinner: false, can_input_lunch: false, can_input_dinner: false, message: "Store Offline" },
                    analysis: null
                });
            }


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

            const currentWindow = WasteController.getShiftWindow(centralNow);

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
            const centralNow = WasteController.getCentralDateTime(new Date());
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

            // 2. Tag Villains in items for Pareto analysis
            const taggedItems = items.map((item: any) => ({
                ...item,
                is_villain: VILLAINS.some(v => item.protein.includes(v))
            }));

            // 3. Create Log
            await prisma.wasteLog.create({
                data: {
                    store_id: userStoreId,
                    date: logDate,
                    shift: shift,
                    input_by: 'Manager',
                    user_id: userId,
                    items: taggedItems
                }
            });

            // 3. Update Compliance Counters
            // Find current week compliance
            const centralDate = WasteController.getCentralDateTime(new Date());
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
    static async getHistory(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userStoreId = req.user?.storeId || req.user?.store_id || 1;
            let storeId = userStoreId;

            // @ts-ignore
            if (((req as any).user?.role === 'admin' || (req as any).user?.role === 'director') && req.query.store_id) {
                storeId = parseInt(req.query.store_id as string);
            }

            const range = req.query.range as string || 'this-month';
            // Simple date filtering
            const now = new Date();
            let startDate = new Date();
            startDate.setDate(1); // Start of month default

            if (range === 'this-week') {
                const day = now.getDay() || 7;
                startDate = new Date(now);
                startDate.setDate(now.getDate() - day + 1);
            } else if (range === 'last-month') {
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            } else if (range === 'ytd') {
                startDate = new Date(now.getFullYear(), 0, 1);
            }

            const logs = await prisma.wasteLog.findMany({
                where: {
                    store_id: storeId,
                    date: { gte: startDate }
                },
                orderBy: { date: 'asc' }
            });

            // Group by date
            const history: Record<string, number> = {};
            logs.forEach(log => {
                const dateStr = new Date(log.date).toISOString().split('T')[0];
                const items = log.items as any[];
                const total = items.reduce((sum, item) => sum + (item.weight || 0), 0);
                history[dateStr] = (history[dateStr] || 0) + total;
            });

            const chartData = Object.entries(history).map(([date, pounds]) => ({
                date,
                pounds
            }));

            res.json(chartData);
        } catch (error) {
            console.error('Failed to fetch waste history', error);
            res.status(500).json({ error: 'Failed to fetch history' });
        }
    }

    static async getDetailedHistory(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userStoreId = req.user?.storeId || req.user?.store_id || 1;
            let storeId = userStoreId;

            // @ts-ignore
            if (((req as any).user?.role === 'admin' || (req as any).user?.role === 'director') && req.query.store_id) {
                storeId = parseInt(req.query.store_id as string);
            }

            const limit = parseInt(req.query.limit as string) || 20;

            const logs = await prisma.wasteLog.findMany({
                where: { store_id: storeId },
                orderBy: { date: 'desc' },
                take: limit
            });

            // Return raw logs, frontend will group
            res.json(logs);
        } catch (error) {
            console.error('Failed to fetch detailed history', error);
            res.status(500).json({ error: 'Failed to fetch detailed history' });
        }
    }

    static async getNetworkWasteStatus(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const companyId = user.companyId || user.company_id || 'tdb-main';

            const today = new Date();
            const centralDate = WasteController.getCentralDateTime(today);
            const dateStr = centralDate.toISOString().split('T')[0];
            const startOfDay = new Date(dateStr);
            startOfDay.setHours(0, 0, 0, 0);

            // 1. Fetch all stores for the company
            const stores = await prisma.store.findMany({
                where: { company_id: companyId },
                select: { id: true, store_name: true, location: true, target_lbs_guest: true }
            });

            // 2. Fetch today's logs for these stores
            const logs = await prisma.wasteLog.findMany({
                where: {
                    store_id: { in: stores.map(s => s.id) },
                    date: startOfDay
                }
            });

            // 3. Process each store
            let totalWasteLbsNet = 0;
            let totalProjectedNet = 0;
            let storesReported = 0;

            const statusGrid = stores.map(store => {
                const storeLogs = logs.filter(l => l.store_id === store.id);
                const hasLog = storeLogs.length > 0;

                let wasteLbs = 0;
                if (hasLog) {
                    storeLogs.forEach(l => {
                        const items = l.items as any[];
                        items.forEach(i => wasteLbs += i.weight);
                    });
                }

                const storeTarget = store.target_lbs_guest || 1.76;
                const mockForecast = 150; // Standardize for grid comparison
                const projectedUsage = mockForecast * storeTarget;

                const wastePercent = hasLog ? (wasteLbs / projectedUsage) * 100 : 0;

                // Status Mapping: MISSING, GREEN (<1%), YELLOW (1-5%), RED (>5%)
                let status = 'MISSING';
                if (hasLog) {
                    if (wastePercent > 5) status = 'RED';
                    else if (wastePercent > 1) status = 'YELLOW';
                    else status = 'GREEN';

                    totalWasteLbsNet += wasteLbs;
                    totalProjectedNet += projectedUsage;
                    storesReported++;
                }

                return {
                    id: store.id,
                    name: store.store_name,
                    location: store.location,
                    status,
                    waste_lbs: parseFloat(wasteLbs.toFixed(1)),
                    waste_percent: parseFloat(wastePercent.toFixed(2)),
                    is_locked: hasLog // UI uses this to show submitted icon
                };
            });

            const companyAvgPercent = totalProjectedNet > 0 ? (totalWasteLbsNet / totalProjectedNet) * 100 : 0;

            return res.json({
                date: dateStr,
                total_stores: stores.length,
                submitted_count: storesReported,
                company_avg_percent: parseFloat(companyAvgPercent.toFixed(2)),
                stores: statusGrid
            });

        } catch (error) {
            console.error('Network Waste Status Error:', error);
            return res.status(500).json({ error: 'Failed to fetch network waste status' });
        }
    }
    private static async checkAccountabilityGate(storeId: number, dateStr: string): Promise<boolean> {
        // 1. Check if any invoice was logged today for this store
        const invoices = await prisma.invoiceRecord.findMany({
            where: {
                store_id: storeId,
                date: {
                    gte: new Date(dateStr),
                    lt: new Date(new Date(dateStr).getTime() + 86400000)
                }
            }
        });

        if (invoices.length > 0) return true;

        // 2. Check for manual "No Delivery" flag in AuditLog
        const noDeliveryFlag = await prisma.auditLog.findFirst({
            where: {
                location: storeId.toString(),
                action: 'NO_DELIVERY_FLAG',
                created_at: {
                    gte: new Date(dateStr),
                    lt: new Date(new Date(dateStr).getTime() + 86400000)
                }
            }
        });

        return !!noDeliveryFlag;
    }
}
