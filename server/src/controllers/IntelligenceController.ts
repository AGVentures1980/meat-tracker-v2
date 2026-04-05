
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { MeatEngine } from '../engine/MeatEngine';
import OpenAI from 'openai';

const prisma = new PrismaClient();

export class IntelligenceController {
    /**
     * GET /api/v1/intelligence/anomalies
     * Identifies stores with consumption variance > 15% vs group average
     */
    static async getAnomalies(req: Request, res: Response) {
        try {
            const stats = await MeatEngine.getExecutiveStats((req as any).user);
            const anomalies = stats.performance.filter(store => {
                const variancePct = (Math.abs(store.lbsGuestVar) / store.target_lbs_guest) * 100;
                return variancePct > 15;
            });

            const baseAnomalies = anomalies.map(a => ({
                storeId: a.id,
                name: a.name,
                variance: (a.lbsGuestVar / a.target_lbs_guest) * 100,
                lbsPerGuest: a.lbsPerGuest,
                target: a.target_lbs_guest,
                impact: a.impactYTD,
                type: 'VARIANCE'
            }));

            // Fetch recent QC alerts (last 48 hours)
            const twoDaysAgo = new Date();
            twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

            const recentRejections = await prisma.barcodeScanEvent.findMany({
                where: {
                    is_approved: false,
                    scanned_at: { gte: twoDaysAgo }
                },
                include: { store: true },
                orderBy: { scanned_at: 'desc' },
                take: 10
            });

            const qcAnomalies = recentRejections.map(rejection => ({
                storeId: rejection.store_id,
                name: (rejection as any).store?.store_name || `Store #${rejection.store_id}`,
                variance: 0,
                lbsPerGuest: 0,
                target: 0,
                impact: 0,
                type: 'QC_ALERT',
                barcode: rejection.scanned_barcode,
                date: rejection.scanned_at
            }));

            return res.json({
                success: true,
                anomalies: [...qcAnomalies, ...baseAnomalies]
            });
        } catch (error) {
            return res.status(500).json({ success: false, error: 'Failed to fetch anomalies' });
        }
    }

    /**
     * GET /api/v1/intelligence/resolve-gtin?gtin=...
     * Simulates the Brasa Executive Intelligence Agent querying the Global Network Graph
     * to resolve an unknown GTIN into a standardized protein specification.
     */
    static async resolveGTIN(req: Request, res: Response) {
        try {
            const { gtin } = req.query;
            if (!gtin || typeof gtin !== 'string') {
                return res.status(400).json({ success: false, error: 'GTIN required' });
            }

            // Fallback for demo specific codes to guarantee speedy, exact responses:
            const globalMockDatabase: Record<string, { protein_name: string, brand: string }> = {
                '00012345678905': { protein_name: 'Test Filet Mignon', brand: 'Global Network Vendor' },
            };
            if (globalMockDatabase[gtin]) {
                return res.json({ success: true, found: true, ...globalMockDatabase[gtin] });
            }

            // Real AI Resolution via OpenAI
            const openai = new OpenAI(); // Automatically uses process.env.OPENAI_API_KEY
            const prompt = `You are an expert meat industry supply chain AI. 
A user has scanned a raw GS1-128 barcode string: ${gtin}. 

Your task is to:
1. Extract the core 14-digit GTIN (usually immediately following the 01 application identifier).
2. Identify the Manufacturer/Packer and the common Generic Protein Name (e.g., "Beef Ribs", "Lamb Chops", "Picanha", "Filet Mignon") associated with this GTIN or its Company Prefix.

Respond ONLY with a JSON object in this exact format, with no extra markdown or text:
{"success": true, "found": true, "extracted_gtin": "14-digit GTIN pure numbers here", "protein_name": "...", "brand": "..."}
If you absolutely cannot find any info, STILL return found: true but with protein_name: "Generic Meat", brand: "Unknown Packer: " + ${gtin}, and do your best to extract the GTIN. Never return found: false.`;

            const completion = await openai.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'gpt-4o', // Fastest model for this small text task
                temperature: 0.1,
                response_format: { type: "json_object" }
            });

            const content = completion.choices[0].message.content;
            if (!content) throw new Error("No response from AI");
            
            const result = JSON.parse(content);
            return res.json(result);

        } catch (error) {
            console.error('Agent Resolution Error:', error);
            return res.status(500).json({ success: false, error: 'Agent search failed' });
        }
    }

    /**
     * GET /api/v1/intelligence/supply-suggestions

     * Suggests order quantities based on Forecast, Targets, and Current Inventory.
     * Query: ?date=YYYY-MM-DD (Monday of the week to order for)
     */
    static async getSupplySuggestions(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            let storeId = user?.storeId || 1;

            // Allow Admin/Director to override storeId for Drill-Down awareness
            const queryStoreId = req.query.storeId ? parseInt(req.query.storeId as string) : null;
            if (queryStoreId && (user?.role === 'admin' || user?.role === 'director')) {
                storeId = queryStoreId;
            }

            const textDate = req.query.date as string;

            // Default to next week if no date provided? Or current?
            // Let's assume frontend sends the target Monday.
            if (!textDate) {
                return res.status(400).json({ error: 'Target Week Date (Monday) required' });
            }

            const targetWeekStart = new Date(textDate);

            // 1. Get Forecast
            const forecast = await prisma.salesForecast.findUnique({
                where: {
                    store_id_week_start: {
                        store_id: storeId,
                        week_start: targetWeekStart
                    }
                }
            });

            if (!forecast) {
                return res.json({
                    success: true,
                    suggestions: [],
                    warning: 'No forecast found for this week. Please submit a forecast first.'
                });
            }

            // 2. Get Targets
            const targets = await prisma.storeMeatTarget.findMany({
                where: { store_id: storeId }
            });

            if (targets.length === 0) {
                return res.json({
                    success: true,
                    suggestions: [],
                    missing_targets: true, // Flag for Frontend to show "Initialize" button
                    warning: 'No meat targets configured.'
                });
            }

            // 3. Get Current Inventory (Latest Weekly Close)
            // We need the MOST RECENT inventory record for each item.
            // This is complex in Prisma without a distinctive "CurrentInventory" table.
            // Approximating by getting the latest InventoryRecord entries.
            // A better query would be: SELECT * FROM InventoryRecord WHERE store_id = X ORDER BY date DESC
            // But we need distinct items.
            // Let's fetch the last 7 days of inventory records.
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const recentInventory = await prisma.inventoryRecord.findMany({
                where: {
                    store_id: storeId,
                    date: { gte: sevenDaysAgo }
                },
                orderBy: { date: 'desc' }
            });

            // Deduplicate to get latest per item
            const onHandMap = new Map<string, number>();
            recentInventory.forEach(inv => {
                const key = inv.item_name; // Need to map this to Protocol Protein Name if they differ
                if (!onHandMap.has(key)) {
                    onHandMap.set(key, inv.quantity);
                }
            });

            // 5. Get Invoices since Inventory Date
            // We need to fetch invoices for ALL items to match efficiently.
            const lastInventoryDate = recentInventory.length > 0 ? recentInventory[0].date : sevenDaysAgo;

            const recentInvoices = await prisma.invoiceRecord.findMany({
                where: {
                    store_id: storeId,
                    date: { gt: lastInventoryDate }
                }
            });

            // Map Invoices to Proteins (Aggregating quantity)
            const invoiceMap = new Map<string, number>();
            recentInvoices.forEach(inv => {
                // Here we rely on item_name matching protein. 
                // In production, we should use ProductAlias to normalize.
                // For this implementation, we assume standardized names or aliases.
                const key = inv.item_name;
                invoiceMap.set(key, (invoiceMap.get(key) || 0) + inv.quantity);
            });

            // 6. Calculate Estimated Depletion (Projected Usage since Monday)
            // Logic: How many days have passed since the "Reference Monday"?
            // Or since the Last Inventory Date?
            // "Inventory Date" is typically Sunday Night.
            // "Forecast" applies to the Week starting Monday.

            // Determine Days Passed since Start of Week (0 = Monday, 1 = Tuesday...)
            const today = new Date();
            const diffTime = Math.abs(today.getTime() - targetWeekStart.getTime());

            const currentDayIndex = (today.getDay() + 6) % 7; // Mon=0, Tue=1, Wed=2...

            // Standard Usage Curve (Approximate % of Weekly Volume per Day)
            // Mon: 10%, Tue: 12%, Wed: 14%, Thu: 16%, Fri: 20%, Sat: 20%, Sun: 8%
            const dailyWeights = [0.10, 0.12, 0.14, 0.16, 0.20, 0.20, 0.08];

            let accumulatedWeight = 0;
            for (let i = 0; i < currentDayIndex; i++) {
                if (i < 7) accumulatedWeight += dailyWeights[i];
            }
            // Add half of today's weight (assuming "until Lunch")? 
            // User said: "ja vamos saber ... ate o almoco da quarta". 
            // If today is Wed, we count Mon+Tue + (Wed/2).
            if (currentDayIndex < 7) {
                accumulatedWeight += (dailyWeights[currentDayIndex] * 0.5);
            }

            // 4. Calculate Suggestions
            const suggestions = targets.map(t => {
                const protein = t.protein;
                const targetLbsRequest = t.target; // Lbs per Guest

                // Shift-Aware Logic:
                // Some items are Dinner Only.
                // We need to know which ones.
                // Currently hardcoded in MeatEngine or Standards. 
                // ideally passed from MeatStandards config or stored in DB.
                // For now, using the "Generic" formula: TotalForecast * Target
                // Refinement: If we want strict Dinner Only logic here, we need the list.
                // Let's us specific logic if we can match the protein name.

                let relevantGuests = (forecast.forecast_lunch + forecast.forecast_dinner);

                // Hacky "Dinner Only" check based on typical names
                if (['Lamb Chops', 'Beef Ribs', 'Filet Mignon'].includes(protein)) {
                    relevantGuests = forecast.forecast_dinner;
                }

                const requiredLbs = relevantGuests * targetLbsRequest;

                // --- Dynamic Inventory Calculation ---
                const lastCount = onHandMap.get(protein) || 0;
                const received = invoiceMap.get(protein) || 0;

                // Depletion = TotalWeeklyNeed * %TimePassed
                const estimatedDepletion = requiredLbs * accumulatedWeight;

                // Estimated On Hand = LastCount + Received - Depletion
                const estimatedOnHand = Math.max(0, (lastCount + received) - estimatedDepletion);

                // For ordering, we check against the Week's Remaining Need?
                // Or simply TotalNeed - EstimatedOnHand?
                const safetyStock = requiredLbs * 0.15; // 15% Safety Buffer

                const netNeed = (requiredLbs + safetyStock) - estimatedOnHand;
                const totalSuggested = Math.max(0, netNeed);

                // Triple-Split Logic (25% / 50% / 25%)
                const orderMon = totalSuggested * 0.25;
                const orderWed = totalSuggested * 0.50;
                const orderSat = totalSuggested * 0.25;

                return {
                    protein: protein,
                    targetParams: { guests: relevantGuests, lbsPerGuest: targetLbsRequest },
                    required: parseFloat(requiredLbs.toFixed(1)),

                    // Inventory Details
                    lastCount: parseFloat(lastCount.toFixed(1)),
                    received: parseFloat(received.toFixed(1)),
                    depletion: parseFloat(estimatedDepletion.toFixed(1)),
                    onHand: parseFloat(estimatedOnHand.toFixed(1)), // This is now ESTIMATED

                    safetyStock: parseFloat(safetyStock.toFixed(1)),
                    suggestedOrder: parseFloat(totalSuggested.toFixed(1)),
                    breakdown: {
                        mon: parseFloat(orderMon.toFixed(1)),
                        wed: parseFloat(orderWed.toFixed(1)),
                        sat: parseFloat(orderSat.toFixed(1))
                    },
                    unit: 'LB',
                    priority: totalSuggested > (requiredLbs * 0.5) ? 'High' : 'Normal',
                    status: totalSuggested > 0 ? 'Order Needed' : 'Sufficient'
                };
            });
            // .filter(s => s.suggestedOrder > 0 || s.onHand < s.required); // REMOVED: Always show all items so the table doesn't disappear

            return res.json({
                success: true,
                week: targetWeekStart,
                day_index: currentDayIndex,
                accumulated_weight: accumulatedWeight,
                forecast_summary: {
                    lunch: forecast.forecast_lunch,
                    dinner: forecast.forecast_dinner
                },
                suggestions
            });

        } catch (error) {
            console.error('Smart Order Error:', error);
            return res.status(500).json({ success: false, error: 'Failed to generate suggestions' });
        }
    }

    /**
     * GET /api/v1/intelligence/pilot-dashboard
     * Aggregates the 90-day pilot data for a specific store
     */
    static async getPilotDashboard(req: Request, res: Response) {
        try {
            const storeId = parseInt(req.query.storeId as string);
            if (!storeId) {
                return res.status(400).json({ error: 'storeId is required' });
            }

            const store = await prisma.store.findUnique({
                where: { id: storeId },
                include: { company: true }
            });

            if (!store) {
                return res.status(404).json({ error: 'Store not found' });
            }

            // Fetch the daily audits ordered by day number
            const audits = await prisma.pilotDailyAudit.findMany({
                where: { store_id: storeId },
                orderBy: { day_number: 'asc' }
            });

            let totalSavings = 0;
            const timeline = audits.map(audit => {
                totalSavings += audit.yield_savings_usd;
                const gainShareDaily = audit.yield_savings_usd * 0.08;
                return {
                    day_number: audit.day_number,
                    date: audit.audit_date,
                    daily_score: audit.daily_score,
                    daily_savings: audit.yield_savings_usd,
                    gain_share_8pct: gainShareDaily,
                    accumulated_savings: totalSavings,
                    insight: audit.meat_rotation_insight,
                    summary: audit.ai_executive_summary
                };
            });

            // Is the pilot finished?
            const currentDay = audits.length > 0 ? audits[audits.length - 1].day_number : 0;
            const isFinished = currentDay >= 90;
            
            // Calculate final performance fee
            const finalFee = totalSavings * 0.08; // 8%

            return res.json({
                success: true,
                store_name: store.store_name,
                pilot_status: isFinished ? 'COMPLETED' : 'IN_PROGRESS',
                current_day: currentDay,
                days_remaining: Math.max(0, 90 - currentDay),
                total_savings_recovered: totalSavings,
                agv_performance_fee: finalFee,
                timeline
            });

        } catch (error) {
            console.error('Pilot Dashboard Error:', error);
            return res.status(500).json({ success: false, error: 'Failed to fetch pilot data' });
        }
    }
}
