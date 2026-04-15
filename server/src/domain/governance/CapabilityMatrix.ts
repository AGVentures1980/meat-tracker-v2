// server/src/domain/governance/CapabilityMatrix.ts

import { GovernanceState, DomainType } from './ReasonCodes';
import { DomainStatus } from './DomainIntegrityModel';

export type Capability = 
  | 'VIEW_EXECUTIVE_LBS_PAX'
  | 'VIEW_FINANCIAL_IMPACT'
  | 'VIEW_OPERATIONAL_STATS'
  | 'EXPORT_REPORTS'
  | 'APPROVE_INVENTORY';

export class CapabilityMatrix {
  /**
   * Resolves capabilities across global states with support for domain-specific restriction logic mapping.
   */
  static resolve(
    globalState: GovernanceState, 
    domainStatuses?: Record<DomainType, DomainStatus>
  ): { allowed: Capability[], blocked: Capability[] } {
    
    const all: Capability[] = [
      'VIEW_EXECUTIVE_LBS_PAX', 
      'VIEW_FINANCIAL_IMPACT', 
      'VIEW_OPERATIONAL_STATS', 
      'EXPORT_REPORTS', 
      'APPROVE_INVENTORY'
    ];
    let allowed: Capability[] = [];

    switch (globalState) {
      case 'NORMAL':
        allowed = [...all]; // Future enhancement: Contextually strip particular caps if a non-fatal domain is SUSPECT
        break;
      case 'DEGRADED':
        allowed = ['VIEW_OPERATIONAL_STATS', 'APPROVE_INVENTORY'];
        break;
      case 'RESTRICTED':
        allowed = ['APPROVE_INVENTORY'];
        break;
      case 'HARDLOCK':
        allowed = [];
        break;
    }

    return {
      allowed,
      blocked: all.filter(c => !allowed.includes(c))
    };
  }
}
