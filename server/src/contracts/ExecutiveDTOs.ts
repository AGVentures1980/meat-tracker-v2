export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ExecMetric<T> {
    value: T | null;
    confidence: ConfidenceLevel;
    sources: string[];
    reasonIfNull?: string;
}

export interface ExecutiveHealthHeaderDTO {
    integrityScore: ExecMetric<number>;
    executiveRiskLevel: ExecMetric<'STABLE' | 'ELEVATED' | 'HIGH' | 'CRITICAL'>;
    weeklyVarianceUSD: ExecMetric<number>;
    trend4WeeksStatus: 'IMPROVING' | 'DEGRADING' | 'FLAT';
}

export interface ChannelBreakdownDTO {
    diningRoom: {
        guests: ExecMetric<number>;
        lbsConsumed: ExecMetric<number>;
        lbsPerGuest: ExecMetric<number>;
        lossPerGuest: ExecMetric<number>;
    };
    barALaCarte: {
        lbsConsumed: ExecMetric<number>;
        proteinCostAllocated: ExecMetric<number>;
        topItemImpact: string;
    };
    deliveryOLO: {
        lbsConsumed: ExecMetric<number>;
        proteinCostAllocated: ExecMetric<number>;
        deliveryFoodCostPercent: ExecMetric<number>;
    };
}

export interface ExecutiveActionRecommendationDTO {
    code: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    title: string;
    description: string;
    financialImpactEstimate: number;
    targetType: 'STORE' | 'SUPPLIER' | 'CHANNEL' | 'PRODUCT';
    targetId: string;
    recommendation: string;
}

export interface ExecutiveOverviewDTO {
    health: ExecutiveHealthHeaderDTO;
    channels: ChannelBreakdownDTO;
    recommendedActions: ExecutiveActionRecommendationDTO[];
}
