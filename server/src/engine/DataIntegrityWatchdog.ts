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
        let deliveryIntegrityStatus: 'NOT_APPLICABLE' | 'ZERO_CONFIRMED' | 'CONFIRMED' | 'UNAVAILABLE' = 'UNAVAILABLE';

        // 1. DELIVERY FIREWALL ABSOLUTE (FASE 6)
        // Determine explicit flags based on data shape. For now assume channel enabled unless explicit store flag exists later.
        const delivery_channel_enabled = true; // Placeholder for Store configuration
        
        // Check if there's any sync audit log that affirms the system polled delivery on this day.
        const syncLogs = await prisma.auditLog.count({
            where: {
                action: 'DELIVERY_SYNC',
                company_id: String(storeId), // Adapting as per current schema structure
                created_at: { gte: start, lte: end }
            }
        });

        const deliverySales = await prisma.deliverySale.findMany({
            where: {
                store_id: storeId,
                created_at: { gte: start, lte: end }
            }
        });

        const delivery_feed_received = syncLogs > 0 || deliverySales.length > 0;
        const delivery_data_fresh = true; // Assuming True if feed received within timeframe
        const delivery_orders_count = deliverySales.length;
        const delivery_weight_total = deliverySales.reduce((acc, sale) => acc + sale.total_lbs, 0);

        if (!delivery_channel_enabled) {
            deliveryIntegrityStatus = 'NOT_APPLICABLE';
            lockReason = 'DELIVERY_NOT_APPLICABLE';
        } 
        else if (delivery_feed_received && delivery_data_fresh && delivery_orders_count === 0 && delivery_weight_total === 0) {
            deliveryIntegrityStatus = 'ZERO_CONFIRMED';
            lockReason = 'DELIVERY_ZERO_CONFIRMED';
        }
        else if (delivery_feed_received && delivery_data_fresh && delivery_orders_count > 0 && delivery_weight_total > 0) {
            deliveryIntegrityStatus = 'CONFIRMED';
            lockReason = 'DELIVERY_CONFIRMED';
        } 
        else {
            state = 'DEGRADED';
            deliveryIntegrityStatus = 'UNAVAILABLE';
            lockReason = 'DELIVERY_DATA_UNAVAILABLE';
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
                state = 'RESTRICTED';
                lockReason += `RESTRICTED OPERATION: Unaccounted loss reached ${lossPercent.toFixed(1)}%. `;
            } else if (lossPercent > 0.75) {
                lockReason += `WARNING: Unaccounted loss creeping to ${lossPercent.toFixed(1)}%. `;
            }
        }

        return {
            state,
            lockReason: lockReason.trim(),
            totalLostLbs,
            deliveryIntegrityStatus
        };
    }

}
