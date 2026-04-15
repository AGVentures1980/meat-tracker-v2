import { PrismaClient } from '@prisma/client';
import { 
    ExecutiveLevel1OverviewDTO, 
    ExecMetric,
    ExecutiveActionRecommendationDTO
} from '../contracts/ExecutiveDTOs';

const prisma = new PrismaClient();

export class ExecutiveMetricsService {

    /**
     * Extracts the pristine Level 1 Overview for the C-Level Dashboard Landing.
     * Hard-cuts all analytical bloat focusing exclusively on:
     * Integrity, Financial Loss, Governance Risk, Base Menu Compass, Worst Offender.
     */
    public static async getLevel1Overview(companyId: string, storeId?: number): Promise<ExecutiveLevel1OverviewDTO> {
        
        // --- 1. MOCK / SCAFFOLD DATA PULLS FOR THE ALGORITHMS ---
        const totalGuests = await this.getPosGuestsMock(storeId);
        const diningRoomLbs = await this.getDiningRoomLbsMock(storeId);
        const activeVariancesUSD = await this.getOpenVariancesUsdMock(storeId);

        // --- 2. FAIL-CLOSED CALCULATIONS ---
        const lbsPerGuest: ExecMetric<number> = {
            value: null,
            confidence: 'LOW',
            sources: ['POS', 'ProteinConsumptionAllocation']
        };

        if (totalGuests === 0 || totalGuests === null) {
            lbsPerGuest.reasonIfNull = 'POS_GUEST_DATA_MISSING_OR_ZERO';
        } else {
            lbsPerGuest.value = parseFloat((diningRoomLbs / totalGuests).toFixed(2));
            lbsPerGuest.confidence = 'HIGH';
        }

        // --- 3. EXECUTIVE ACTIONS GENERATION (Max 5, Descending Priority Impact) ---
        let recommendedActions: ExecutiveActionRecommendationDTO[] = [];
        
        if (activeVariancesUSD > 1000) {
            recommendedActions.push({
                code: 'EVT_HIGH_VARIANCE',
                severity: 'HIGH',
                title: 'High Variance Bleed in Allocations',
                description: `Weekly Variance is tracking at $${activeVariancesUSD}. Immediate audit on Doca and Transformation is required.`,
                financialImpactEstimateUSD: activeVariancesUSD,
                targetType: 'STORE',
                targetId: storeId ? storeId.toString() : 'GLOBAL',
                recommendation: 'Command GM to reconcile open VarianceCases before proceeding with next Purchase Order.'
            });
        }

        if (lbsPerGuest.value !== null && lbsPerGuest.value > 2.5) {
            recommendedActions.push({
                code: 'EVT_ABNORMAL_CONSUMPTION',
                severity: 'CRITICAL',
                title: 'Abnormal Paxs Consumption Rate',
                description: `Lbs Per Guest is tracking at ${lbsPerGuest.value} Lbs. Expected is ~1.8 Lbs. Ghost plates or heavy theft likely.`,
                financialImpactEstimateUSD: (lbsPerGuest.value - 1.8) * totalGuests * 5.0, // Cost Estimate
                targetType: 'CHANNEL',
                targetId: 'DINING_ROOM', // Refined Channel
                recommendation: 'Initiate Floor Manager investigation on pass-through controls.'
            });
        }

        // Enforce Panel UX Discipline: Only top 5 actions by Impact
        recommendedActions = recommendedActions
            .sort((a, b) => b.financialImpactEstimateUSD - a.financialImpactEstimateUSD)
            .slice(0, 5);

        // --- 4. COMPOSE PRISTINE LEVEL 1 PAYLOAD ---
        return {
            health: {
                operatingIntegrityScore: { value: 85, confidence: 'MEDIUM', sources: ['AuditLog', 'VarianceCase'] },
                executiveRiskLevel: { value: recommendedActions.some(a => a.severity === 'CRITICAL') ? 'CRITICAL' : 'STABLE', confidence: 'HIGH', sources: ['ExecutiveActionEngine'] },
                weeklyVarianceUSD: { value: activeVariancesUSD, confidence: 'HIGH', sources: ['VarianceCase'] },
                lbsPerGuestDiningRoom: lbsPerGuest,
                storeIntegrityDegradation: { value: 'STORE_CHICAGO ( -12% Degradation )', confidence: 'HIGH', sources: ['StoreIntegritySnapshot'] }
            },
            actionPanel: recommendedActions
        };
    }

    // -- Private Mocks for Demonstration --
    private static async getPosGuestsMock(storeId?: number) { return 450; } 
    private static async getDiningRoomLbsMock(storeId?: number) { return 1100; }
    private static async getOpenVariancesUsdMock(storeId?: number) { return 1200; }
}
