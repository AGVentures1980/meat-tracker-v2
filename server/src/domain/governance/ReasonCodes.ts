// server/src/domain/governance/ReasonCodes.ts

export enum GovernanceReasonCode {
  // Delivery
  DELIVERY_KNOWN_ZERO = 'DELIVERY_KNOWN_ZERO',
  DELIVERY_UNKNOWN = 'DELIVERY_UNKNOWN',
  DELIVERY_EXPECTED_BUT_MISSING = 'DELIVERY_EXPECTED_BUT_MISSING',
  DELIVERY_FAILURE_CONFIRMED = 'DELIVERY_FAILURE_CONFIRMED',
  DELIVERY_CONFIRMED_PRESENT = 'DELIVERY_CONFIRMED_PRESENT',

  // Limits
  YIELD_LOSS_WARNING = 'YIELD_LOSS_WARNING',
  YIELD_LOSS_RESTRICTED = 'YIELD_LOSS_RESTRICTED',
  CRITICAL_UNACCOUNTED_LOSS = 'CRITICAL_UNACCOUNTED_LOSS',
  MATH_INTEGRITY_COMPROMISED = 'MATH_INTEGRITY_COMPROMISED'
}

export type TrustLevel = 'VERIFIED' | 'SUSPECT' | 'UNVERIFIED' | 'COMPROMISED';
export type GovernanceState = 'NORMAL' | 'DEGRADED' | 'RESTRICTED' | 'HARDLOCK';
export type DomainType = 'DELIVERY' | 'SALES' | 'INVENTORY' | 'PROTEIN_LIFECYCLE';

export interface GovernanceEvidence {
  code: GovernanceReasonCode;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  metadata: Record<string, any>;
  timestamp: Date;
  
  // Future-proofing for manual audit resolutions
  requiresManualResolution?: boolean;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
}
