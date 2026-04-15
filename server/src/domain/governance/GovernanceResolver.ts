// server/src/domain/governance/GovernanceResolver.ts

import { DeliveryFirewall, IDeliveryRepository } from './DeliveryFirewall';
import { CapabilityMatrix } from './CapabilityMatrix';
import { GovernanceEvidence, GovernanceReasonCode, DomainType, GovernanceState } from './ReasonCodes';
import { GovernancePolicyConfig } from './GovernancePolicyConfig';
import { DomainIntegrityModel, DomainStatus } from './DomainIntegrityModel';

export interface IWatchdogEngine {
    performIntegrityAudit(storeId: number, start: Date, end: Date): Promise<{ state: string, lockReason: string, totalLostLbs: number }>;
}

export class GovernanceResolver {
  static async resolveGovernance(
    deliveryRepo: IDeliveryRepository,
    watchdogEngine: IWatchdogEngine,
    storeId: number, 
    start: Date, 
    end: Date, 
    options = { hasDelivery: true }
  ): Promise<DomainIntegrityModel> {
    
    // Inicialização da estrutura de Domínios
    const domainStatuses: Record<DomainType, DomainStatus> = {
      DELIVERY: { domain: 'DELIVERY', trustLevel: 'UNVERIFIED', governanceState: 'NORMAL', evidence: [] },
      SALES: { domain: 'SALES', trustLevel: 'UNVERIFIED', governanceState: 'NORMAL', evidence: [] },
      INVENTORY: { domain: 'INVENTORY', trustLevel: 'UNVERIFIED', governanceState: 'NORMAL', evidence: [] },
      PROTEIN_LIFECYCLE: { domain: 'PROTEIN_LIFECYCLE', trustLevel: 'UNVERIFIED', governanceState: 'NORMAL', evidence: [] }
    };

    let globalState: GovernanceState = 'NORMAL';

    // ==========================================
    // 1. DELIVERY DOMAIN
    // ==========================================
    const deliveryEvidence = await DeliveryFirewall.evaluatePeriod(deliveryRepo, storeId, start, end, options.hasDelivery);
    domainStatuses.DELIVERY.evidence.push(deliveryEvidence);

    if (deliveryEvidence.code === GovernanceReasonCode.DELIVERY_EXPECTED_BUT_MISSING || deliveryEvidence.code === GovernanceReasonCode.DELIVERY_FAILURE_CONFIRMED) {
      domainStatuses.DELIVERY.governanceState = 'DEGRADED';
      domainStatuses.DELIVERY.trustLevel = 'COMPROMISED';
      globalState = 'DEGRADED';
    } else if (deliveryEvidence.code === GovernanceReasonCode.DELIVERY_CONFIRMED_PRESENT || deliveryEvidence.code === GovernanceReasonCode.DELIVERY_KNOWN_ZERO) {
      domainStatuses.DELIVERY.trustLevel = 'VERIFIED';
    } else {
      domainStatuses.DELIVERY.trustLevel = 'SUSPECT';
      globalState = 'DEGRADED';
    }

    // ==========================================
    // 2. PROTEIN LIFECYCLE DOMAIN (Watchdog)
    // ==========================================
    const watchDogStats = await watchdogEngine.performIntegrityAudit(storeId, start, end);
    const thresholds = GovernancePolicyConfig.thresholds.unaccountedLoss;
    
    if (watchDogStats.totalLostLbs > thresholds.absoluteLbsCritical || watchDogStats.state === 'HARDLOCK') {
      globalState = 'HARDLOCK';
      domainStatuses.PROTEIN_LIFECYCLE.governanceState = 'HARDLOCK';
      domainStatuses.PROTEIN_LIFECYCLE.trustLevel = 'COMPROMISED';
      domainStatuses.PROTEIN_LIFECYCLE.evidence.push({ code: GovernanceReasonCode.CRITICAL_UNACCOUNTED_LOSS, severity: 'CRITICAL', metadata: { lbs: watchDogStats.totalLostLbs }, timestamp: new Date(), requiresManualResolution: true });
    } else if (watchDogStats.state === 'RESTRICTED') {
      if (globalState !== 'HARDLOCK') globalState = 'RESTRICTED';
      domainStatuses.PROTEIN_LIFECYCLE.governanceState = 'RESTRICTED';
      domainStatuses.PROTEIN_LIFECYCLE.trustLevel = 'SUSPECT';
      domainStatuses.PROTEIN_LIFECYCLE.evidence.push({ code: GovernanceReasonCode.YIELD_LOSS_RESTRICTED, severity: 'WARNING', metadata: { lbs: watchDogStats.totalLostLbs }, timestamp: new Date(), requiresManualResolution: true });
    } else {
      domainStatuses.PROTEIN_LIFECYCLE.trustLevel = 'VERIFIED';
    }

    // ==========================================
    // 3. CAPABILITY GATING & RESOLUTION
    // ==========================================
    const gating = CapabilityMatrix.resolve(globalState, domainStatuses);

    return {
      globalState,
      domainStatuses,
      allowedCapabilities: gating.allowed,
      blockedCapabilities: gating.blocked
    };
  }
}
