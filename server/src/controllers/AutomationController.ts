import { Request, Response } from 'express';
import multer from 'multer';

// Configure memory storage for file uploads
const storage = multer.memoryStorage();
export const upload = multer({ storage: storage });

export class AutomationController {

    /**
     * POST /api/v1/automation/ocr-invoice
     * Simulates scanning a purchase invoice (OCR).
     */
    static async scanInvoice(req: Request, res: Response) {
        try {
            // Simulate processing delay (2 seconds)
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Return mocked "Scanned" data
            // In a real app, this would come from AWS Textract or Google Vision
            const scannedData = {
                vendor: "Sysco Food Services",
                date: new Date().toISOString().split('T')[0],
                invoice_id: "INV-" + Math.floor(Math.random() * 100000),
                items: [
                    { item: "Picanha", qty: 250, cost: 1500.00 },
                    { item: "Lamb Chops", qty: 40, cost: 680.00 },
                    { item: "Chicken Wrapped", qty: 120, cost: 420.00 },
                    { item: "Salmon", qty: 30, cost: 350.50 }
                ]
            };

            return res.json({
                success: true,
                message: "Invoice scanned successfully.",
                data: scannedData
            });

        } catch (error) {
            console.error('OCR Error:', error);
            return res.status(500).json({ error: 'Failed to scan invoice' });
        }
    }

    /**
     * GET /api/v1/automation/olo-sales
     * Simulates fetching weekly sales/guest data from OLO.
     */
    static async fetchOloSales(req: Request, res: Response) {
        try {
            const { week } = req.query;

            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Mocked OLO Data
            const oloData = {
                store_id: 180, // Tampa
                week: week || 10,
                guests: 1342, // Specific number to prove it came from API
                sales_summary: {
                    total_sales: 75000.00,
                    delivery_sales: 12000.00,
                    dine_in_sales: 63000.00
                }
            };

            return res.json({
                success: true,
                message: "OLO Data synchronized.",
                data: oloData
            });

        } catch (error) {
            console.error('OLO Error:', error);
            return res.status(500).json({ error: 'Failed to sync OLO data' });
        }
    }
}
