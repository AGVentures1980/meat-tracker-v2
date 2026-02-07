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
     * Simulates fetching weekly sales/guest data from OLO with Logic.
     */
    static async fetchOloSales(req: Request, res: Response) {
        try {
            const { week } = req.query;

            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            // 1. Simulate Raw Order Data (What OLO would actually send)
            // 50 Churrasco Plates, 10 Feasts, 20 Sandwiches
            const rawOrders = [
                { item: "Churrasco Plate", qty: 50 },
                { item: "Churrasco Feast", qty: 10 },
                { item: "Picanha Sandwich", qty: 20 },
                { item: "Filet Mignon (0.5lb)", qty: 10 },
                { item: "Lamb Chops (1lb)", qty: 5 }
            ];

            // 2. Import Definitions & Constants
            // In a real app, these would be imported at top level
            const { COMBO_DEFINITIONS } = require('../config/combos');
            const TARGET_PER_GUEST = 1.76;

            let totalMeatWeight = 0;
            let calculatedGuests = 0;

            // 3. Calculate Weight & Guests
            rawOrders.forEach(order => {
                const lowerName = order.item.toLowerCase();
                const combo = COMBO_DEFINITIONS[lowerName];

                // 3. Calculate Weight & Guests
                rawOrders.forEach(order => {
                    const lowerName = order.item.toLowerCase();

                    // Specific Rules based on Prototype constraints
                    if (lowerName.includes('feast')) {
                        // Feast: 2.0 lbs meat, 4 Guests
                        totalMeatWeight += (2.0 * order.qty);
                        calculatedGuests += (4 * order.qty);
                    } else if (lowerName.includes('plate')) {
                        // Plate: 1.0 lb meat, 1 Guest
                        totalMeatWeight += (1.0 * order.qty);
                        calculatedGuests += (1 * order.qty);
                    } else {
                        // Loose Items / Sides
                        // Rule: "0.5 lb serves 2 people" => 1 lb serves 4 people => Guests = Weight * 4
                        let weight = 0;
                        if (lowerName.includes('0.5lb')) weight = 0.5;

                    } catch (error) {
                        console.error('OLO Error:', error);
                        return res.status(500).json({ error: 'Failed to sync OLO data' });
                    }
                }
}
