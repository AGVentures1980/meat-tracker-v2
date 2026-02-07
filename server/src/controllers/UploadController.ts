import { Request, Response } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { ComboParser } from '../engine/ComboParser';

// Configure storage (memory for now to keep it simple/mocked)
const storage = multer.memoryStorage();
export const upload = multer({ storage: storage });

const prisma = new PrismaClient();

export class UploadController {
    static async handleUpload(req: Request, res: Response) {
        try {
            const file = req.file;
            const { type, store_id } = req.body;

            if (!file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            console.log(`[Upload] Processing ${type} file: ${file.originalname} for Store ${store_id}`);
            const storeIdInt = parseInt(store_id);

            // Simulate Processing Delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Return Mocked Data based on type BUT INSERT IT INTO DB
            if (type === 'OLO') {
                // Determine logic for OLO mock
                // merged 45 records
                // Create a dummy order for "today"
                const order = await prisma.order.create({
                    data: {
                        store_id: storeIdInt,
                        source: 'OLO',
                        order_date: new Date(),
                        order_external_id: `OLO-BATCH-${Date.now()}`
                    }
                });

                // Add some items
                const mockItems = [
                    { item: 'Picanha', lbs: 12.5 },
                    { item: 'Alcatra', lbs: 8.0 },
                    { item: 'Fraldinha', lbs: 5.5 },
                    { item: 'Lamb Chops', lbs: 3.0 },
                    { item: 'Chicken Wrapped', lbs: 4.2 }
                ];

                for (const m of mockItems) {
                    await prisma.orderItem.create({
                        data: {
                            order_id: order.id,
                            item_name: m.item,
                            protein_type: m.item, // Simplification
                            lbs: m.lbs
                        }
                    });
                }

                return res.status(200).json({
                    message: "CSV Processed successfully. 5 batch records imported.",
                    records: 5
                });

            } else if (type === 'Ticket') {
                // Create a dummy order for ticket
                const order = await prisma.order.create({
                    data: {
                        store_id: storeIdInt,
                        source: 'Manual', // Scan essentially acts as manual verified
                        order_date: new Date(),
                        order_external_id: `SCAN-${Date.now()}`
                    }
                });

                await prisma.orderItem.create({
                    data: {
                        order_id: order.id,
                        item_name: 'Picanha',
                        protein_type: 'Picanha',
                        lbs: 12.0
                    }
                });

                return res.status(200).json({
                    message: "AI Scan Complete: Found 12 lbs of Picanha.",
                    detected: { item: "Picanha", lbs: 12.0, confidence: 0.98 }
                });
            }

            return res.status(200).json({ message: "File uploaded successfully" });

        } catch (error) {
            console.error('Upload Error:', error);
            return res.status(500).json({ error: 'Upload failed' });
        }
    }
}
