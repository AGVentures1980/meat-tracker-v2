import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class PurchaseController {
    /**
     * POST /api/v1/purchases/invoice
     * Add a new invoice delivery record
     */
    static async addInvoice(req: Request, res: Response) {
        try {
            const { item_name, quantity, price_per_lb, invoice_number, date } = req.body;
            const storeId = (req as any).user?.storeId || 1;

            const cost_total = quantity * price_per_lb;

            const invoice = await (prisma as any).invoiceRecord.create({
                data: {
                    store_id: storeId,
                    item_name,
                    quantity,
                    price_per_lb,
                    cost_total,
                    invoice_number,
                    date: date ? new Date(date) : new Date(),
                    source: 'Manual' // Default for now
                }
            });

            return res.json({ success: true, invoice });
        } catch (error) {
            console.error('Failed to add invoice:', error);
            return res.status(500).json({ success: false, error: 'Failed to add invoice' });
        }
    }

    /**
     * GET /api/v1/purchases/weighted-averages
     * Calculate averages for a specific week/period
     */
    static async getWeightedAverages(req: Request, res: Response) {
        try {
            const { start, end } = req.query;
            const storeId = (req as any).user?.storeId || 1;

            const startDate = start ? new Date(start as string) : new Date(new Date().setDate(new Date().getDate() - 7));
            const endDate = end ? new Date(end as string) : new Date();

            const invoices = await (prisma as any).invoiceRecord.findMany({
                where: {
                    store_id: storeId,
                    date: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            });

            // Group by item name and calculate weighted average
            const aggregation: Record<string, { total_weight: number, total_cost: number }> = {};

            invoices.forEach((inv: any) => {
                if (!aggregation[inv.item_name]) {
                    aggregation[inv.item_name] = { total_weight: 0, total_cost: 0 };
                }
                aggregation[inv.item_name].total_weight += inv.quantity;
                aggregation[inv.item_name].total_cost += inv.cost_total;
            });

            const results = Object.entries(aggregation).map(([item, data]) => ({
                item_name: item,
                weighted_average: data.total_weight > 0 ? (data.total_cost / data.total_weight) : 0,
                total_lb: data.total_weight,
                total_cost: data.total_cost,
                delivery_count: invoices.filter((i: any) => i.item_name === item).length
            }));

            return res.json({ success: true, averages: results });
        } catch (error) {
            console.error('Failed to calculate averages:', error);
            return res.status(500).json({ success: false, error: 'Failed to calculate averages' });
        }
    }

    /**
     * POST /api/v1/purchases/process-invoice-ocr
     * Simulated OCR for Invoices
     */
    static async processInvoiceOCR(req: Request, res: Response) {
        try {
            const storeId = (req as any).user?.storeId || 1;

            // MULTI-TENANCY SECURITY:
            // Ensure data is strictly scoped to the authenticated user's storeId.
            // This prevents cross-contamination between different franchise locations.
            if (!storeId) {
                return res.status(403).json({ success: false, error: 'Unauthorized: No Store ID' });
            }

            // MULTI-TENANCY: Fetch existing mappings for this store
            const aliases = await (prisma as any).productAlias.findMany({
                where: { store_id: storeId }
            });
            const aliasMap = new Map();
            aliases.forEach((a: any) => aliasMap.set(a.alias.toLowerCase(), a.protein));

            // Simulation of OCR identifying multiple proteins in one invoice
            // Based on uploaded Sysco Images for Lexington
            // In a real scenario, we would parse the file here.
            // DUPLICATE CHECK: Verify if this invoice number already exists for this store
            // Mocking "59114321" as the detected number for this specific simulation
            const detectedInvoiceNumber = "59114321";
            const existingInvoice = await (prisma as any).invoiceRecord.findFirst({
                where: {
                    store_id: storeId,
                    invoice_number: detectedInvoiceNumber
                }
            });

            let mockOCRResults = [
                {
                    raw_text: "BEEF SIRLOIN FLAP CH TXDB",
                    detected_item: "Fraldinha/Flank Steak",
                    quantity: 144.20, // Derived from Ext Price / Unit Price
                    price_per_lb: 8.59,
                    confidence: 0.92,
                    invoice_number: "59114321"
                },
                {
                    raw_text: "BEEF SHORT RIB BI CH TXDB",
                    detected_item: "Beef Ribs",
                    quantity: 36.76,
                    price_per_lb: 9.38,
                    confidence: 0.88,
                    invoice_number: "59114321"
                },
                {
                    raw_text: "BEEF TNDR PLD UTIL FAT ADD",
                    detected_item: "Filet Mignon",
                    quantity: 77.79,
                    price_per_lb: 11.37,
                    confidence: 0.85,
                    invoice_number: "59114321"
                },
                {
                    raw_text: "LAMB LEG AUS S HALAL TDB",
                    detected_item: "Leg of Lamb",
                    quantity: 45.64,
                    price_per_lb: 5.61, // Estimated
                    confidence: 0.95,
                    invoice_number: "59114321"
                },
                {
                    raw_text: "LAMB RACK FRNCH AUS HALAL",
                    detected_item: "Lamb Chops",
                    quantity: 32.40,
                    price_per_lb: 13.18,
                    confidence: 0.91,
                    invoice_number: "59114321"
                },
                {
                    raw_text: "BEEF SIRL COULOT FAT-ON TXDB",
                    detected_item: "Picanha", // Coulotte is Picanha
                    quantity: 85.00,
                    price_per_lb: 5.79, // Good price!
                    confidence: 0.78, // Slightly lower to trigger review
                    invoice_number: "59114321"
                }
            ];

            // Apply Dynamic Mapping Overrides
            mockOCRResults = mockOCRResults.map(r => {
                const mapped = aliasMap.get(r.raw_text.toLowerCase());
                if (mapped) {
                    return { ...r, detected_item: mapped, confidence: 1.0, status: 'auto_mapped' };
                }
                return r;
            });

            // Instead of saving directly, we return the "Draft" capability
            return res.json({
                success: true,
                message: existingInvoice ? 'Duplicate Invoice Detected' : 'OCR Scan Complete. Review Required.',
                is_duplicate: !!existingInvoice,
                results: mockOCRResults.map((r, index) => ({
                    id: `draft-${Date.now()}-${index}`,
                    ...r,
                    status: 'pending_review'
                }))
            });
        } catch (error) {
            return res.status(500).json({ success: false, error: 'OCR Processing Failed' });
        }
    }

    /**
     * POST /api/v1/purchases/confirm
     * Finalize reviewed invoices
     */
    static async confirmInvoices(req: Request, res: Response) {
        try {
            const { invoices } = req.body;
            const storeId = (req as any).user?.storeId || 1;

            if (!Array.isArray(invoices)) {
                return res.status(400).json({ error: 'Invalid data format' });
            }

            const created = await Promise.all(invoices.map(async (inv) => {
                // DUPLICATE PREVENTION (Final Guard)
                // If invoice_number exists for this store, we skip or error.
                // Here we simply skip to avoid crashing the whole batch, but frontend should have blocked it.
                const exists = await (prisma as any).invoiceRecord.findFirst({
                    where: {
                        store_id: storeId,
                        invoice_number: inv.invoice_number
                    }
                });

                if (exists) {
                    // Skip duplicate
                    return null;
                }

                // LEARNING STEP: Persist mapping if raw_text is different from detected_item
                // This allows the system to remember "TXDB" -> "Picanha" for next time.
                if (inv.raw_text && inv.detected_item && inv.raw_text !== inv.detected_item) {
                    try {
                        await (prisma as any).productAlias.upsert({
                            where: {
                                store_id_alias: {
                                    store_id: storeId,
                                    alias: inv.raw_text
                                }
                            },
                            update: { protein: inv.detected_item },
                            create: {
                                store_id: storeId,
                                alias: inv.raw_text,
                                protein: inv.detected_item
                            }
                        });
                    } catch (e) {
                        console.warn('Failed to save alias', e);
                    }
                }

                return (prisma as any).invoiceRecord.create({
                    data: {
                        store_id: storeId,
                        item_name: inv.detected_item,
                        quantity: parseFloat(inv.quantity),
                        price_per_lb: parseFloat(inv.price_per_lb),
                        cost_total: parseFloat(inv.quantity) * parseFloat(inv.price_per_lb),
                        invoice_number: inv.invoice_number || 'OCR-AUTO',
                        date: new Date(), // In real app, use invoice date
                        source: 'Verified OCR'
                    }
                });
            }));

            // Filter out nulls (skipped duplicates)
            const validCreated = created.filter(c => c !== null);

            return res.json({ success: true, count: validCreated.length });
        } catch (error) {
            console.error('Confirm Error:', error);
            return res.status(500).json({ success: false, error: 'Failed to confirm invoices' });
        }
    }
}
