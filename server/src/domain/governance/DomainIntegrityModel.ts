// server/src/domain/governance/DomainIntegrityModel.ts

import { GovernanceEvidence, GovernanceState, TrustLevel, DomainType } from './ReasonCodes';
import { Capability } from './CapabilityMatrix';

export interface DomainStatus {
  domain: DomainType;
  trustLevel: TrustLevel;
  governanceState: GovernanceState;
  evidence: GovernanceEvidence[];
}

export interface DomainIntegrityModel {
  globalState: GovernanceState;
  domainStatuses: Record<DomainType, DomainStatus>;
  allowedCapabilities: Capability[];
  blockedCapabilities: Capability[];
}
