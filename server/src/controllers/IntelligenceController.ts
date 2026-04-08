
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
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            return res.status(500).json({ success: false, error: 'Failed to fetch anomalies' });
        }
    }

    static async resolveGTIN(req: Request, res: Response) {
        try {
            const { gtin } = req.query;
            if (!gtin || typeof gtin !== 'string') {
                return res.status(400).json({ success: false, error: 'GTIN required' });
            }

            const cleanBarcode = gtin.replace(/\\D/g, '');

            // Deterministic Global GTIN Extraction (Protects from AI Hallucinations)
            let extractedGt = cleanBarcode;
            const gtinMatch = cleanBarcode.match(/(?:01|02)(\d{14})/);
            if (gtinMatch) {
                extractedGt = gtinMatch[1];
            } else if (cleanBarcode.length === 14) {
                extractedGt = cleanBarcode;
            }

            // 1. DETERMINISTIC GOVERNANCE (Override AI for known culprits)
            // JBS USA / Friboi
            if (cleanBarcode.includes('0076338') || cleanBarcode.includes('0079338')) {
                // Check for specific SKUs inside the payload (extracting item ref without check digit)
                if (extractedGt.length === 14) {
                    const sku = extractedGt.substring(8, 13);
                    if (['88851', '88847', '87947'].includes(sku)) {
                        return res.json({
                            success: true,
                            found: true,
                            extracted_gtin: extractedGt,
                            protein_name: "Fraldinha / Flap Meat",
                            brand: "JBS USA / Friboi"
                        });
                    }
                    if (['16041', '16045', '01604'].includes(sku)) {
                        return res.json({
                            success: true,
                            found: true,
                            extracted_gtin: extractedGt,
                            protein_name: "Picanha / Sirloin Cap",
                            brand: "JBS USA / Friboi"
                        });
                    }

                    return res.json({
                        success: true,
                        found: true,
                        extracted_gtin: extractedGt,
                        protein_name: "Generic Meat",
                        brand: "JBS USA / Friboi"
                    });
                }
            }

            // Real AI Resolution via OpenAI
            const openai = new OpenAI(); // Automatically uses process.env.OPENAI_API_KEY
            const prompt = `You are an expert meat industry supply chain AI. 
A user has scanned a raw GS1-128 barcode string: ${cleanBarcode}. 

Your task is to identify the Manufacturer/Packer and the common Generic Protein Name (e.g., "Beef Ribs", "Lamb Chops", "Picanha", "Filet Mignon") associated with this barcode.

INTELLIGENCE DIRECTIVES:
If the GTIN contains '90627577091328' or its prefix is '0627577', the Protein MUST be "Sirloin / Picanha" and the Brand MUST be "Clear River Farms (JBS Canada)".

We have already deterministically extracted the GTIN as: ${extractedGt}. You must return this exact string in the 'extracted_gtin' field.

Respond ONLY with a JSON object in this exact format, with no extra markdown or text:
{"success": true, "found": true, "extracted_gtin": "${extractedGt}", "protein_name": "...", "brand": "..."}
If you absolutely cannot find any info, STILL return found: true but with protein_name: "Generic Meat", brand: "Unknown Packer", and always return extracted_gtin: "${extractedGt}". Never return found: false.`;

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

        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
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

        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
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

        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Pilot Dashboard Error:', error);
            return res.status(500).json({ success: false, error: 'Failed to fetch pilot data' });
        }
    }
    
    /**
     * POST /api/v1/intelligence/ocr/invoice
     * Processes OCR text from an uploaded invoice, matches against Corporate Specs,
     * and flags PRICE_DRIFT_ALERT if the invoiced price exceeds the contracted price.
     */
    static async processInvoiceOCR(req: Request, res: Response) {
        try {
            const { ocrText, invoiceId, storeId } = req.body;
            const targetStoreId = storeId || (req as any).user?.storeId;

            if (!ocrText || !targetStoreId) {
                return res.status(400).json({ error: 'ocrText and storeId are required' });
            }

            // 1. Fetch Corporate Specs to get Baseline Prices
            const store = await prisma.store.findUnique({ 
                where: { id: targetStoreId },
                include: { company: true }
            });

            if (!store) {
                return res.status(404).json({ error: 'Store not found' });
            }

            const specs = await prisma.corporateProteinSpec.findMany({
                where: { company_id: store.company_id }
            });

            // Map specs for prompt
            const specList = specs.map(s => `${s.protein_name} (Max Price: $${s.cost_per_lb || 'Unknown'}/lb)`).join(', ');

            // 2. OpenAI Extraction
            const openai = new OpenAI();
            const prompt = `You are a Supply Chain Auditing AI. Extract line items from this raw invoice OCR text.
Here are the corporate approved proteins: ${specList}.
Match the items on the invoice to these approved proteins.

RAW OCR TEXT:
---
${ocrText}
---

Extract an array of "items" with these fields:
- "protein_name" (mapped to one of our approved proteins, or exact name if not found)
- "invoiced_price_per_lb" (float)
- "weight" (total lbs, float)
- "supplier" (string)

Return EXACTLY a JSON object with {"items": [...]}. No markup, no markdown.`;

            const completion = await openai.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'gpt-4o',
                temperature: 0.1,
                response_format: { type: "json_object" }
            });

            const content = completion.choices[0].message.content;
            if (!content) throw new Error("No response from OCR AI");
            
            const result = JSON.parse(content);
            const processedItems = [];

            // 3. Process each item and apply Price Governance
            for (const item of result.items) {
                const spec = specs.find(s => s.protein_name.toLowerCase() === item.protein_name.toLowerCase());
                
                let status = "APPROVED_PRICE";
                let alertSeverity = null;
                let variance = 0;

                // Drift detection logic
                if (spec && spec.cost_per_lb && item.invoiced_price_per_lb) {
                    if (item.invoiced_price_per_lb > spec.cost_per_lb) {
                        status = "PRICE_DRIFT_ALERT";
                        alertSeverity = "HIGH";
                        variance = item.invoiced_price_per_lb - spec.cost_per_lb;
                    }
                } else if (!spec) {
                    status = "UNMAPPED_ITEM_ALERT";
                    alertSeverity = "MEDIUM";
                }

                // Create the Receiving Event for the invoice line
                const event = await prisma.receivingEvent.create({
                    data: {
                        store_id: targetStoreId,
                        scanned_barcode: `INV_OCR_${invoiceId || Date.now()}`,
                        product_code: item.protein_name,
                        weight: item.weight,
                        supplier: item.supplier,
                        status: status,
                        alert_severity: alertSeverity,
                        invoice_id: invoiceId || "UNKNOWN",
                        invoiced_price_per_lb: item.invoiced_price_per_lb
                    }
                });

                processedItems.push({
                    id: event.id,
                    protein: item.protein_name,
                    invoiced_price: item.invoiced_price_per_lb,
                    contract_price: spec?.cost_per_lb || null,
                    variance: variance,
                    status: status
                });
            }

            return res.json({
                success: true,
                invoice_id: invoiceId,
                total_items_processed: processedItems.length,
                results: processedItems
            });

        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('OCR Invoice Processing Error:', error);
            return res.status(500).json({ success: false, error: 'Failed to process invoice OCR' });
        }
    }

    /**
     * GET /api/v1/intelligence/ocr/drifts
     * Fetches all PRICE_DRIFT_ALERT items for the executives to audit and block supplier payments.
     */
    static async getPriceDrifts(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            // Get drifting issues within the user's domain
            const drifts = await prisma.receivingEvent.findMany({
                where: {
                    status: 'PRICE_DRIFT_ALERT'
                },
                include: { store: true },
                orderBy: { created_at: 'desc' },
                take: 50
            });

            return res.json({
                success: true,
                drifts: drifts.map(d => ({
                    id: d.id,
                    store: d.store.store_name,
                    item: d.product_code,
                    supplier: d.supplier,
                    invoiced_price: d.invoiced_price_per_lb,
                    variance_estimated: 'Unknown %', // Would need exact spec price here, assuming >0
                    date: d.created_at,
                    invoice_id: d.invoice_id
                }))
            });

        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('OCR Drifts Error:', error);
            return res.status(500).json({ success: false, error: 'Failed to fetch price drifts' });
        }
    }
}
