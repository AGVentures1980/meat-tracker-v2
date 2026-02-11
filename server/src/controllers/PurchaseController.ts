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

            // Simulation of OCR identifying multiple proteins in one invoice
            const mockOCRResults = [
                { item_name: 'Picanha', quantity: 10, price_per_lb: 9.91 },
                { item_name: 'Fraldinha/Flank Steak', quantity: 15, price_per_lb: 8.24 }
            ];

            const createdInvoices = await Promise.all(mockOCRResults.map(data =>
                (prisma as any).invoiceRecord.create({
                    data: {
                        store_id: storeId,
                        ...data,
                        cost_total: data.quantity * data.price_per_lb,
                        source: 'OCR',
                        date: new Date()
                    }
                })
            ));

            return res.json({
                success: true,
                message: 'Invoice OCR processed and records saved',
                results: createdInvoices
            });
        } catch (error) {
            return res.status(500).json({ success: false, error: 'OCR Processing Failed' });
        }
    }
}
