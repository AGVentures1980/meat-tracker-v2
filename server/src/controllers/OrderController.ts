
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ComboParser } from '../engine/ComboParser';

const prisma = new PrismaClient();

export class OrderController {
    static async createOrder(req: Request, res: Response) {
        try {
            const { store_id, source, order_date, items } = req.body;

            // Validate inputs
            if (!store_id || !items || !Array.isArray(items)) {
                return res.status(400).json({ error: 'Invalid payload' });
            }

            // Transaction: Create Order -> Create Items (Exploded by ComboParser)
            const result = await prisma.$transaction(async (tx) => {
                const order = await tx.order.create({
                    data: {
                        store_id: store_id,
                        source: source,
                        order_date: new Date(order_date),
                    }
                });

                for (const rawItem of items) {
                    // Explode potential combos
                    const processedItems = ComboParser.parse(rawItem.item_name, rawItem.lbs);

                    for (const finalItem of processedItems) {
                        await tx.orderItem.create({
                            data: {
                                order_id: order.id,
                                item_name: finalItem.item_name,
                                protein_type: finalItem.protein_type,
                                lbs: finalItem.lbs
                            }
                        });
                    }
                }

                return order;
            });

            return res.status(201).json(result);

        } catch (error) {
            console.error('Order Creation Error:', error);
            return res.status(500).json({ error: 'Failed to create order' });
        }
    }
}
