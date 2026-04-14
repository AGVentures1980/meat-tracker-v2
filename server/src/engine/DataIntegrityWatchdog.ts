import { PrismaClient } from '@prisma/client';
import { startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

const prisma = new PrismaClient();

export class DataIntegrityWatchdog {

    /**
     * Executes the Enterprise Progressive Governance Rule.
     * Evaluates Unaccounted Loss and Delivery Sync Presence.
     * @returns { state: 'NORMAL' | 'DEGRADED' | 'RESTRICTED' | 'HARDLOCK', lockReason: string, totalLostLbs: number }
     */
    static async performIntegrityAudit(storeId: number, start: Date, end: Date) {
        
        let state: 'NORMAL' | 'DEGRADED' | 'RESTRICTED' | 'HARDLOCK' = 'NORMAL';
        let lockReason = '';

        // 1. DELIVERY FIREWALL ABSOLUTE (FASE 6)
        // If delivery API is down or no sales logged, we CANNOT assume 0. We downgrade to DEGRADED.
        const deliverySalesCount = await prisma.deliverySale.count({
            where: {
                store_id: storeId,
                created_at: { gte: start, lte: end }
            }
        });

        if (deliverySalesCount === 0) {
            state = 'DEGRADED';
            lockReason += 'Delivery data unavailable — score withheld. ';
        }

        // 2. UNACCOUNTED LOSS CALCULATION (FASE 3 & FASE 8)
        const lossEvents = await prisma.boxLifecycleEvent.findMany({
            where: {
                store_id: storeId,
                timestamp: { gte: start, lte: end },
                event_type: 'ADMIN_ADJUST',
                reason: { contains: 'UNACCOUNTED_LOSS' }
            }
        });

        const totalLostLbs = lossEvents.reduce((acc, ev) => acc + (ev.weight_variance || 0), 0);

        if (totalLostLbs > 0) {
            // Need to calculate % loss to determine tier
            const consumedSales = await prisma.orderItem.findMany({
                where: {
                    order: {
                        store_id: storeId,
                        order_date: { gte: start, lte: end }
                    }
                }
            });
            const totalConsumedVolume = consumedSales.reduce((acc, item) => acc + item.lbs, 0);
            // Protect div by 0 if no sales yet
            const systemVolume = totalConsumedVolume + totalLostLbs;
            const lossPercent = systemVolume > 0 ? (totalLostLbs / systemVolume) * 100 : 0;

            if (totalLostLbs > 10.0 || lossPercent > 2.5) {
                state = 'HARDLOCK';
                lockReason += `CRITICAL UNACCOUNTED LOSS: ${totalLostLbs.toFixed(2)} lbs (${lossPercent.toFixed(1)}%). Threshold Maximum Breached. `;
            } else if (lossPercent > 1.5) {
                if (state !== 'HARDLOCK') state = 'RESTRICTED';
                lockReason += `RESTRICTED OPERATION: Unaccounted loss reached ${lossPercent.toFixed(1)}%. `;
            } else if (lossPercent > 0.75) {
                lockReason += `WARNING: Unaccounted loss creeping to ${lossPercent.toFixed(1)}%. `;
            }
        }

        return {
            state,
            lockReason: lockReason.trim(),
            totalLostLbs
        };
    }

}
