import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getISOWeek, getYear } from 'date-fns';
import { ProteinLifecycleStrictEngine, HardFailError } from '../engine/ProteinLifecycleStrictEngine';
import { BarcodeParserRouter, LabelDataFusionEngine } from '../services/LabelDataFusionEngine';
import { ComplianceEngine } from '../services/ComplianceEngine';

const prisma = new PrismaClient();

export class InventoryController {

    /**
     * Handles the "Weekly Close" submission.
     * Expects:
     * - store_id
     * - date (The Sunday of the count)
     * - guests (Total guests for the week)
     * - inventory: [{ item: string, qty: number }]
     * - purchases: [{ date: string, item: string, qty: number, cost: number }]
     */
    static async submitWeeklyClose(req: Request, res: Response) {
        try {
            const { store_id, date, guests, lunchGuests, dinnerGuests, inventory, purchases } = req.body;

            if (!store_id || !date) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const closeDate = new Date(date);
            const weekNum = getISOWeek(closeDate);
            const yearNum = getYear(closeDate);
            const periodKey = `${yearNum}-W${weekNum}`; // Pattern used in Seed

            // Use transaction to ensure data integrity
            await prisma.$transaction(async (tx) => {
                // 1. Clear existing Inventory for this specific date (allows overwriting corrections)
                // We strictly clear "Count" for this day.
                await tx.inventoryRecord.deleteMany({
                    where: {
                        store_id: Number(store_id),
                        date: closeDate
                    }
                });

                // 2. Clear existing Purchases for this week? 
                // This is trickier if they input day-by-day. 
                // But if this is a "Weekly Batch Input", we might want to replace the week's batch.
                // For V2 V2, let's assume they might enter purchases multiple times?
                // No, the requirement is "Weekly Input Screen". Implies one-shot.
                // Let's safe-delete specific purchases if we had IDs, but we don't.
                // For simplicity/robustness in V2: We DON'T delete purchases automatically unless we track a "Batch ID".
                // Let's just ADD purchases. If they made a mistake, they'd need admin help or we need a specific "Edit Purchase" UI.
                // Re-reading user request: "data real de acordo com o que estamos fazendo o input".
                // Let's INSERT purchases.

                // 3. Insert Inventory
                if (inventory && Array.isArray(inventory)) {
                    for (const item of inventory) {
                        if (item.qty >= 0) {
                            await tx.inventoryRecord.create({
                                data: {
                                    store_id: Number(store_id),
                                    date: closeDate,
                                    item_name: item.item,
                                    quantity: Number(item.qty)
                                }
                            });
                        }
                    }
                }

                // 4. Insert Purchases & Invoices (Unified Data Flow)
                if (purchases && Array.isArray(purchases)) {
                    const { MEAT_STANDARDS } = require('../config/standards');
                    // Simple Validation Map (Approximate High/Low limits)
                    // Ponto de Atenção: Prevent crazy inputs
                    const PRICE_LIMITS: Record<string, { min: number, max: number }> = {
                        'Lamb Chops': { min: 8.0, max: 18.0 },
                        'Picanha': { min: 4.0, max: 10.0 },
                        'Filet Mignon': { min: 10.0, max: 25.0 },
                        'Chicken': { min: 0.5, max: 4.0 },
                        'Default': { min: 1.0, max: 20.0 }
                    };

                    for (const p of purchases) {
                        const qty = Number(p.qty);
                        const cost = Number(p.cost);
                        let pricePerLb = 0;

                        if (qty > 0) {
                            pricePerLb = cost / qty;

                            // VALIDATION (Ponto de Atenção)
                            const itemKey = Object.keys(PRICE_LIMITS).find(k => p.item.includes(k)) || 'Default';
                            const limits = PRICE_LIMITS[itemKey];

                            if (pricePerLb < limits.min || pricePerLb > limits.max) {
                                console.warn(`[PRICE ALERT] Anomalous price detected for ${p.item}: $${pricePerLb.toFixed(2)}/lb. (Range: ${limits.min}-${limits.max})`);
                                // In a stricter system, we would throw new Error() here to block the save.
                                // For now, we allow it but log it, as per user request to "Implementar o Ponto de Atenção".
                            }
                        }

                        // A. Create PurchaseRecord (Legacy/Inventory History)
                        await tx.purchaseRecord.create({
                            data: {
                                store_id: Number(store_id),
                                date: new Date(p.date), // Invoice date
                                item_name: p.item,
                                quantity: qty,
                                cost_total: cost
                            }
                        });

                        // B. Create InvoiceRecord (New Source of Truth for CostTargets)
                        // Prevents redundancy: Data entered here now feeds the "Dynamic Cost" logic automatically.
                        await tx.invoiceRecord.create({
                            data: {
                                store_id: Number(store_id),
                                date: new Date(p.date),
                                item_name: p.item,
                                quantity: qty,
                                price_per_lb: pricePerLb,
                                cost_total: cost,
                                invoice_number: `WK-CLOSE-${weekNum}`, // Tagged specifically
                                source: 'Manager Weekly Close'
                            }
                        });
                    }
                }

                // 5. Update Guest Count (Report)
                // We receive 'guests' (Total) for backward compatibility, OR 'dineInGuests' + 'oloGuests'
                let totalGuests = 0;
                let dineIn = 0;
                let delivery = 0;

                if (req.body.lunchGuests !== undefined || req.body.dinnerGuests !== undefined) {
                    const l = Number(req.body.lunchGuests || 0);
                    const d = Number(req.body.dinnerGuests || 0);
                    dineIn = l + d;
                    totalGuests = dineIn + Number(req.body.oloGuests || 0);
                } else if (req.body.dineInGuests !== undefined || req.body.oloGuests !== undefined) {
                    dineIn = Number(req.body.dineInGuests || 0);
                    delivery = Number(req.body.oloGuests || 0);
                    totalGuests = dineIn + delivery;
                } else {
                    // Fallback to legacy single field
                    totalGuests = Number(guests || 0);
                    dineIn = totalGuests; // Assumption if not split
                }

                if (totalGuests > 0) {
                    await tx.report.upsert({
                        where: {
                            store_id_month: {
                                store_id: Number(store_id),
                                month: periodKey
                            }
                        },
                        update: {
                            extra_customers: totalGuests,
                            dine_in_guests: dineIn,
                            delivery_guests: delivery,
                            lunch_guests_micros: Number(req.body.lunchGuests || 0),
                            dinner_guests_micros: Number(req.body.dinnerGuests || 0),
                            total_lbs: 0
                        },
                        create: {
                            store_id: Number(store_id),
                            month: periodKey,
                            extra_customers: totalGuests,
                            dine_in_guests: dineIn,
                            delivery_guests: delivery,
                            lunch_guests_micros: Number(req.body.lunchGuests || 0),
                            dinner_guests_micros: Number(req.body.dinnerGuests || 0),
                            total_lbs: 0
                        }
                    });
                }
            });

            return res.status(200).json({ success: true, message: 'Weekly close saved successfully.' });

        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Weekly Close Error:', error);
            return res.status(500).json({ error: 'Failed to submit weekly close' });
        }
    }

    static async pullToPrep(req: Request, res: Response) {
        try {
            const { store_id, barcode } = req.body;

            if (!store_id || !barcode) {
                return res.status(400).json({ error: 'Missing store_id or barcode' });
            }

            const user = (req as any).user;
            const userId = user?.id || user?.sub || "SYSTEM";

            if (process.env.ENABLE_BARCODE_RUNTIME_TRACE === 'true') {
                 console.log('[BARCODE TRACE] ================== PRODUÇÃO (PULL TO PREP) ==================');
                 console.log(`[BARCODE TRACE] TENTOU PROTEIN BOX? SIM`);
            }
            const targetBox = await prisma.proteinBox.findFirst({
                where: {
                    store_id: Number(store_id),
                    barcode: barcode
                }
            });

            if (targetBox && process.env.ENABLE_BARCODE_RUNTIME_TRACE === 'true') {
                 console.log(`[BARCODE TRACE] ENCONTROU PROTEIN BOX? SIM`);
                 console.log(`[BARCODE TRACE] boxId: ${targetBox.id} | product: ${targetBox.product_name}`);
            }

            if (!targetBox) {
                if (process.env.ENABLE_BARCODE_RUNTIME_TRACE === 'true') {
                     console.log(`[BARCODE TRACE] ENCONTROU PROTEIN BOX? NAO`);
                }
                // BOX MEMORY LAYER: Ghost Receive Identification Fallback
                const store = await prisma.store.findUnique({ where: { id: Number(store_id) } });
                const companyId = store?.company_id;
                
                if (companyId) {
                    if (process.env.ENABLE_BARCODE_RUNTIME_TRACE === 'true') console.log(`[BARCODE TRACE] CHAMOU PARSER? SIM`);
                    const parsedDataArray = await BarcodeParserRouter.parse([barcode], companyId);
                    const supplierRules = await prisma.supplierBarcodeRule.findMany({ where: { companyId, isActive: true } });
                    const { fusedData } = LabelDataFusionEngine.fuse(parsedDataArray, null, supplierRules);
                    
                    if (process.env.ENABLE_BARCODE_RUNTIME_TRACE === 'true') console.log(`[BARCODE TRACE] CHAMOU COMPLIANCE? SIM`);
                    const { specMatched } = await ComplianceEngine.evaluate(fusedData, companyId);
                    
                    if (specMatched) {
                        return res.status(404).json({ 
                            error: `REVIEW_REQUIRED: Produto validado como [${specMatched.protein_name}], mas a CAIXA específica nunca entrou no inventário local via Dock. Bloqueado contra phantom receipts.`,
                            requires_review: true,
                            protein: specMatched.protein_name
                        });
                    }
                }

                return res.status(404).json({ error: 'Security Warning: This barcode was NEVER received into the store inventory! It must pass the Receiving Dock QC first.' });
            }

            if (targetBox.status === 'CONSUMED' || targetBox.status === 'WASTE') {
                return res.status(409).json({ error: 'Conflict: This piece of meat has already been marked as ' + targetBox.status + ' and cannot be pulled.' });
            }
            
            if (targetBox.status === 'PULLED_TO_PREP') {
                 return res.json({ 
                    success: true, 
                    message: 'Box is already in PULLED_TO_PREP status.',
                    protein: targetBox.product_name
                });
            }

            // FASE 1 & 2: STRICT STATE MACHINE & UNIQUE PERMISSION CHECK
            ProteinLifecycleStrictEngine.validateTransition(targetBox.status as any, 'PULLED_TO_PREP', targetBox.barcode);
            await ProteinLifecycleStrictEngine.enforceUniqueOperation(targetBox.id, 'PULL_TO_PREP');

            // Execute the lifecycle mutation transaction
            await prisma.$transaction(async (tx) => {
                await tx.proteinBox.update({
                    where: { id: targetBox.id },
                    data: { status: 'PULLED_TO_PREP' }
                });

                await tx.boxLifecycleEvent.create({
                    data: {
                        box_id: targetBox.id,
                        store_id: Number(store_id),
                        event_type: 'PULL_TO_PREP',
                        previous_status: targetBox.status as any,
                        new_status: 'PULLED_TO_PREP',
                        triggered_by: String(userId),
                        reason: 'Workstation pull request'
                    }
                });
            });

            return res.json({ 
                success: true, 
                message: 'Box validated, tracked, and pulled to Prep successfully.',
                protein: targetBox.product_name,
                weight: targetBox.available_weight_lb,
                lot_number: targetBox.lot_code
            });
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Pull to Prep Error:', error);
            if (error instanceof HardFailError) {
                return res.status(409).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Failed to process Prep Pull' });
        }
    }
    static async consumeBox(req: Request, res: Response) {
        try {
            const { store_id, barcode, note, weight_used } = req.body;
            const user = (req as any).user;
            const userId = user?.id || user?.sub || "SYSTEM";

            if (!store_id || !barcode) {
                return res.status(400).json({ error: 'Missing store_id or barcode' });
            }

            const targetBox = await prisma.proteinBox.findFirst({
                where: {
                    store_id: Number(store_id),
                    barcode: barcode
                }
            });

            if (!targetBox) {
                return res.status(404).json({ error: 'Box not found. This barcode was never received.' });
            }

            if (targetBox.status === 'CONSUMED' || targetBox.status === 'WASTE') {
                return res.status(409).json({ error: 'Conflict: Box is already in a terminal state (' + targetBox.status + ')' });
            }

            // FASE 1 & FASE 4: Validate Transition and Run Loss Tracking Engine
            ProteinLifecycleStrictEngine.validateTransition(targetBox.status as any, 'CONSUMED', targetBox.barcode);
            await ProteinLifecycleStrictEngine.enforceUniqueOperation(targetBox.id, 'CONSUME');
            
            const usedWeight = parseFloat(weight_used) || targetBox.available_weight_lb;
            await ProteinLifecycleStrictEngine.trackInvisibleLoss(targetBox.id, usedWeight, userId);

            await prisma.$transaction(async (tx) => {
                await tx.proteinBox.update({
                    where: { id: targetBox.id },
                    data: { 
                        status: 'CONSUMED',
                        available_weight_lb: 0 
                    }
                });

                await tx.boxLifecycleEvent.create({
                    data: {
                        box_id: targetBox.id,
                        store_id: Number(store_id),
                        event_type: 'CONSUME',
                        previous_status: targetBox.status as any,
                        new_status: 'CONSUMED',
                        triggered_by: String(userId),
                        reason: note || 'Marked as consumed by user',
                        weight_variance: targetBox.available_weight_lb 
                    }
                });
            });

            return res.json({ 
                success: true, 
                message: 'Box marked as CONSUMED successfully.',
                protein: targetBox.product_name,
                terminal_state: 'CONSUMED'
            });
        } catch (error: any) {
            console.error('Consume Box Error:', error);
            return res.status(500).json({ error: 'Failed to consume box' });
        }
    }

    static async wasteBox(req: Request, res: Response) {
        try {
            const { store_id, barcode, reason, weight_lost } = req.body;
            const user = (req as any).user;
            const userId = user?.id || user?.sub || "SYSTEM";

            if (!store_id || !barcode || !reason) {
                return res.status(400).json({ error: 'Missing store_id, barcode, or mandatory reason for waste' });
            }

            const targetBox = await prisma.proteinBox.findFirst({
                where: {
                    store_id: Number(store_id),
                    barcode: barcode
                }
            });

            if (!targetBox) {
                return res.status(404).json({ error: 'Box not found. This barcode was never received.' });
            }

            if (targetBox.status === 'CONSUMED' || targetBox.status === 'WASTE') {
                return res.status(409).json({ error: 'Conflict: Box is already in a terminal state (' + targetBox.status + ')' });
            }

            const variance = weight_lost !== undefined ? Number(weight_lost) : targetBox.available_weight_lb;

            await prisma.$transaction(async (tx) => {
                await tx.proteinBox.update({
                    where: { id: targetBox.id },
                    data: { 
                        status: 'WASTE',
                        available_weight_lb: Math.max(0, targetBox.available_weight_lb - variance)
                    }
                });

                await tx.boxLifecycleEvent.create({
                    data: {
                        box_id: targetBox.id,
                        store_id: Number(store_id),
                        event_type: 'MARK_WASTE',
                        previous_status: targetBox.status as any,
                        new_status: 'WASTE',
                        triggered_by: String(userId),
                        reason: reason,
                        weight_variance: variance
                    }
                });
            });

            return res.json({ 
                success: true, 
                message: 'Box marked as WASTE successfully.',
                protein: targetBox.product_name,
                terminal_state: 'WASTE'
            });
        } catch (error: any) {
            console.error('Waste Box Error:', error);
            return res.status(500).json({ error: 'Failed to mark box as waste' });
        }
    }

    static async auditStaleBoxes(req: Request, res: Response) {
        try {
            const { companyId } = req.query; // optional filter
            const AlertEngine = require('../services/AlertEngine').AlertEngine;

            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            const staleBoxes = await prisma.proteinBox.findMany({
                where: {
                    status: 'PULLED_TO_PREP',
                    updated_at: {
                        lt: twentyFourHoursAgo
                    },
                    tenant_id: companyId ? Number(companyId) : undefined
                }
            });

            const alertsGenerated = [];

            for (const box of staleBoxes) {
                const alert = await AlertEngine.trigger(
                    box.store_id, 
                    'WARNING', 
                    'OPERATIONS_GOVERNANCE', 
                    `Box (Barcode: ${box.barcode}) has been in PULLED_TO_PREP for > 24 hours without being consumed. Potential unaccounted consume or missing stock.`, 
                    { box_id: box.id, barcode: box.barcode, time_since_pull: box.updated_at }
                );
                alertsGenerated.push(alert);
            }

            return res.json({ 
                success: true, 
                message: `Audited ${staleBoxes.length} stale boxes.`,
                alerts_generated: alertsGenerated.length
            });
        } catch (error: any) {
             console.error('Audit Stale Boxes Error:', error);
             return res.status(500).json({ error: 'Failed to audit stale boxes' });
        }
    }
}
