// server/src/domain/governance/Adapters.ts

import { PrismaClient } from '@prisma/client';
import { IDeliveryRepository } from './DeliveryFirewall';
import { IWatchdogEngine } from './GovernanceResolver';
import { DataIntegrityWatchdog } from '../../engine/DataIntegrityWatchdog';

const prisma = new PrismaClient();

export class PrismaDeliveryRepository implements IDeliveryRepository {
    async countSyncLogs(storeId: number, start: Date, end: Date, status: 'SUCCESS' | 'FAILED'): Promise<number> {
        const action = status === 'SUCCESS' ? 'DELIVERY_SYNC_SUCCESS' : 'DELIVERY_SYNC_FAILED';
        return await prisma.auditLog.count({
            where: {
                company_id: String(storeId), // Adhering to the existing schema expectation for store/company linkage
                action: action,
                created_at: { gte: start, lte: end }
            }
        });
    }

    async countSales(storeId: number, start: Date, end: Date): Promise<number> {
        return await prisma.deliverySale.count({
            where: {
                store_id: storeId,
                date: { gte: start, lte: end } // 'date' is used in DeliverySale for the business transaction date
            }
        });
    }
}

export class WatchdogAdapter implements IWatchdogEngine {
    async performIntegrityAudit(storeId: number, start: Date, end: Date) {
        // Here we bridge the old Watchdog output to the new Interface
        const stats = await DataIntegrityWatchdog.performIntegrityAudit(storeId, start, end);
        return {
            state: stats.state,
            lockReason: stats.lockReason,
            totalLostLbs: stats.totalLostLbs
        };
    }
}
