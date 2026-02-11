import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DeliveryController {
    /**
     * POST /api/v1/delivery/sync-olo
     * Applies the "Garcia Rule" for OLO Delivery data conversion.
     */
    static async syncOlo(req: Request, res: Response) {
        try {
            const { storeId, date } = req.body;

            // Simulate OLO API Response
            const oloRawData = [
                { item: "Churrasco Feast", qty: 12 },
                { item: "Churrasco Plate", qty: 45 },
                { item: "Picanha (0.5lb)", qty: 15 },
                { item: "Filet Mignon (0.5lb)", qty: 8 }
            ];

            let totalLbs = 0;
            let calculatedGuests = 0;

            oloRawData.forEach(order => {
                const name = order.item.toLowerCase();
                if (name.includes('feast')) {
                    // Feast Rule: 2.0 lbs = 4 Guests
                    totalLbs += (2.0 * order.qty);
                    calculatedGuests += (4 * order.qty);
                } else if (name.includes('plate')) {
                    // Plate Rule: 1.0 lb = 1 Guest
                    totalLbs += (1.0 * order.qty);
                    calculatedGuests += (1 * order.qty);
                } else {
                    // Loose Meat Rule: 0.5 lb = 2 Guests (Ratio 1:4)
                    const weight = 0.5;
                    totalLbs += (weight * order.qty);
                    calculatedGuests += (weight * 4 * order.qty);
                }
            });

            return res.json({
                success: true,
                storeId,
                date,
                metrics: {
                    totalLbs,
                    calculatedGuests,
                    avgLbsPerGuest: totalLbs / calculatedGuests
                },
                breakdown: oloRawData
            });

        } catch (error) {
            console.error('Delivery Sync Error:', error);
            return res.status(500).json({ error: 'Failed to sync OLO data' });
        }
    }

    /**
     * POST /api/v1/delivery/process-ticket
     * Simulates OCR processing of physical delivery tickets.
     */
    static async processTicket(req: Request, res: Response) {
        try {
            // Simulate processing delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Return mocked "Scanned" data based on Alex's Rules
            const scannedItems = [
                { item: "Churrasco Feast (Family Pack)", qty: 2 },
                { item: "Churrasco Plate (Dine-In Style)", qty: 8 },
                { item: "Picanha Loose 1lb", qty: 3 }
            ];

            let totalLbs = 0;
            let calculatedGuests = 0;

            scannedItems.forEach(order => {
                const name = order.item.toLowerCase();
                if (name.includes('feast')) {
                    totalLbs += (2.0 * order.qty);
                    calculatedGuests += (4 * order.qty);
                } else if (name.includes('plate')) {
                    totalLbs += (1.0 * order.qty);
                    calculatedGuests += (1 * order.qty);
                } else {
                    const weight = name.includes('1lb') ? 1.0 : 0.5;
                    totalLbs += (weight * order.qty);
                    calculatedGuests += (weight * 4 * order.qty);
                }
            });

            return res.json({
                success: true,
                message: "Ticket scanned and processed.",
                metrics: {
                    totalLbs,
                    calculatedGuests
                },
                items: scannedItems
            });

        } catch (error) {
            console.error('OCR Error:', error);
            return res.status(500).json({ error: 'Failed to process ticket' });
        }
    }
}
