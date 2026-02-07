import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getISOWeek, getYear } from 'date-fns';

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
            const { store_id, date, guests, inventory, purchases } = req.body;

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

                // 4. Insert Purchases
                if (purchases && Array.isArray(purchases)) {
                    for (const p of purchases) {
                        await tx.purchaseRecord.create({
                            data: {
                                store_id: Number(store_id),
                                date: new Date(p.date), // Invoice date
                                item_name: p.item,
                                quantity: Number(p.qty),
                                cost_total: Number(p.cost)
                            }
                        });
                    }
                }

                // 5. Update Guest Count (Report)
                // We receive 'guests' (Total) for backward compatibility, OR 'dineInGuests' + 'oloGuests'
                let totalGuests = 0;
                let dineIn = 0;
                let delivery = 0;

                if (req.body.dineInGuests !== undefined || req.body.oloGuests !== undefined) {
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
                            total_lbs: 0
                        },
                        create: {
                            store_id: Number(store_id),
                            month: periodKey,
                            extra_customers: totalGuests,
                            dine_in_guests: dineIn,
                            delivery_guests: delivery,
                            total_lbs: 0
                        }
                    });
                }
            });

            return res.status(200).json({ success: true, message: 'Weekly close saved successfully.' });

        } catch (error) {
            console.error('Weekly Close Error:', error);
            return res.status(500).json({ error: 'Failed to submit weekly close' });
        }
    }
}
