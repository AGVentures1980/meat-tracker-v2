// server/src/domain/governance/DeliveryFirewall.ts

import { GovernanceEvidence, GovernanceReasonCode } from './ReasonCodes';

export interface IDeliveryRepository {
    countSyncLogs(storeId: number, start: Date, end: Date, status: 'SUCCESS'|'FAILED'): Promise<number>;
    countSales(storeId: number, start: Date, end: Date): Promise<number>;
}

export class DeliveryFirewall {
  static async evaluatePeriod(
    repo: IDeliveryRepository, 
    storeId: number, 
    start: Date, 
    end: Date, 
    channelEnabled: boolean
  ): Promise<GovernanceEvidence> {
    
    if (!channelEnabled) {
      return { code: GovernanceReasonCode.DELIVERY_KNOWN_ZERO, severity: 'INFO', metadata: { channelEnabled }, timestamp: new Date() };
    }

    const syncLogsCount = await repo.countSyncLogs(storeId, start, end, 'SUCCESS');
    const failedSyncLogs = await repo.countSyncLogs(storeId, start, end, 'FAILED');
    const salesCount = await repo.countSales(storeId, start, end);

    if (failedSyncLogs > 0) {
      return { code: GovernanceReasonCode.DELIVERY_FAILURE_CONFIRMED, severity: 'WARNING', metadata: { failedSyncLogs }, timestamp: new Date(), requiresManualResolution: true };
    }

    if (salesCount > 0) {
      return { code: GovernanceReasonCode.DELIVERY_CONFIRMED_PRESENT, severity: 'INFO', metadata: { status: 'CONFIRMED' }, timestamp: new Date() };
    }

    if (syncLogsCount > 0 && salesCount === 0) {
      return { code: GovernanceReasonCode.DELIVERY_KNOWN_ZERO, severity: 'INFO', metadata: { syncLogsCount }, timestamp: new Date() };
    }

    if (syncLogsCount === 0 && salesCount === 0) {
      return { code: GovernanceReasonCode.DELIVERY_EXPECTED_BUT_MISSING, severity: 'WARNING', metadata: {}, timestamp: new Date() };
    }

    return { code: GovernanceReasonCode.DELIVERY_UNKNOWN, severity: 'WARNING', metadata: {}, timestamp: new Date() };
  }
}
