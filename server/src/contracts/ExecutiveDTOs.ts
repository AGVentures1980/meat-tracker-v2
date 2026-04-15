export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ExecMetric<T> {
    value: T | null;
    confidence: ConfidenceLevel;
    sources: string[];
    reasonIfNull?: string;
}

// ------------------------------------------------------------------
// LEVEL 1: EXECUTIVE DASHBOARD (Top-5 KPIs + Action Panel)
// ------------------------------------------------------------------
export interface ExecutiveHealthHeaderDTO {
    operatingIntegrityScore: ExecMetric<number>; // Global Truth score
    executiveRiskLevel: ExecMetric<'STABLE' | 'ELEVATED' | 'HIGH' | 'CRITICAL'>;
    weeklyVarianceUSD: ExecMetric<number>;       // The $ Evaporated
    lbsPerGuestDiningRoom: ExecMetric<number>;   // The Operational Compass
    storeIntegrityDegradation: ExecMetric<string>;
}

export interface ExecutiveActionRecommendationDTO {
    code: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    title: string;
    description: string;
    financialImpactEstimateUSD: number;
    targetType: 'STORE' | 'SUPPLIER' | 'CHANNEL' | 'PRODUCT';
    externalReferenceId: string; // Opaque UI Ref
    recommendation: string;
}

export interface ExecutiveLevel1OverviewDTO {
    health: ExecutiveHealthHeaderDTO;
    actionPanel: ExecutiveActionRecommendationDTO[]; // Max 5 items filtered by backend
}

// ------------------------------------------------------------------
// LEVEL 2: ANALYTICAL DRILL-DOWN (Revealed upon expansion)
// ------------------------------------------------------------------
export interface ChannelBreakdownDTO {
    channelCode: 'DINING_ROOM' | 'BAR' | 'OLO';
    lbsConsumedTotal: ExecMetric<number>;
    proteinCostAllocatedUSD: ExecMetric<number>;
    lossPerGuestOrOrder: ExecMetric<number>;
}

export interface AnalyticalLevel2DTO {
    channelBreakdown: ChannelBreakdownDTO[];
    topRiskSuppliers: any[]; // Extended supplier degradation details
    proteinFlowSankeyData: any; // Input -> Output -> Consumed diagram mapping
}

// ------------------------------------------------------------------
// LEVEL 3: DIAGNOSTIC (Granular truth)
// ------------------------------------------------------------------
export interface DiagnosticLevel3DTO {
    openVarianceCases: any[]; 
    criticalFraudEvents: any[];
}
