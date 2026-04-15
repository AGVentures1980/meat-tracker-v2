import { PrismaClient } from '@prisma/client';
import { 
    ExecutiveHealthHeaderDTO, 
    ChannelBreakdownDTO, 
    ExecMetric,
    ExecutiveActionRecommendationDTO,
    ExecutiveOverviewDTO 
} from '../contracts/ExecutiveDTOs';

const prisma = new PrismaClient();

export class ExecutiveMetricsService {

    /**
     * Calculates the overarching health for the C-Level Dashboard
     * respecting Fallback constraints (Fail-Closed divisions).
     */
    public static async getExecutiveOverview(companyId: string, storeId?: number): Promise<ExecutiveOverviewDTO> {
        
        // --- 1. MOCK / SCAFFOLD DATA PULLS FOR THE ALGORITHMS ---
        const totalGuests = await this.getPosGuestsMock(storeId);
        const diningRoomLbs = await this.getDiningRoomLbsMock(storeId);
        const activeVariancesUSD = await this.getOpenVariancesUsdMock(storeId);

        // --- 2. CALCULATE KPIs SECURELY ---
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

        const lossPerGuest: ExecMetric<number> = {
            value: null,
            confidence: 'LOW',
            sources: ['VarianceCase', 'POS']
        };

        if (totalGuests === 0 || totalGuests === null) {
            lossPerGuest.reasonIfNull = 'POS_GUEST_DATA_MISSING_OR_ZERO';
        } else {
            lossPerGuest.value = parseFloat((activeVariancesUSD / totalGuests).toFixed(2));
            lossPerGuest.confidence = 'HIGH';
        }

        // --- 3. EXECUTIVE ACTIONS GENERATION ---
        const recommendedActions: ExecutiveActionRecommendationDTO[] = [];
        
        if (activeVariancesUSD > 1000) {
            recommendedActions.push({
                code: 'EVT_HIGH_VARIANCE',
                severity: 'HIGH',
                title: 'High Variance Bleed in Allocations',
                description: `Weekly Variance is tracking at $${activeVariancesUSD}. Immediate audit on Doca and Transformation is required.`,
                financialImpactEstimate: activeVariancesUSD,
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
                financialImpactEstimate: (lbsPerGuest.value - 1.8) * totalGuests * 5.0, // Rough estimate calculation
                targetType: 'CHANNEL',
                targetId: 'SALAO',
                recommendation: 'Initiate Floor Manager investigation on pass-through controls.'
            });
        }

        // --- 4. COMPOSE PAYLOAD ---
        return {
            health: {
                integrityScore: { value: 85, confidence: 'MEDIUM', sources: ['AuditLog', 'VarianceCase'] },
                executiveRiskLevel: { value: recommendedActions.some(a => a.severity === 'CRITICAL') ? 'CRITICAL' : 'STABLE', confidence: 'HIGH', sources: ['ExecutiveMetricsService'] },
                weeklyVarianceUSD: { value: activeVariancesUSD, confidence: 'HIGH', sources: ['VarianceCase'] },
                trend4WeeksStatus: 'DEGRADING'
            },
            channels: {
                diningRoom: {
                    guests: { value: totalGuests, confidence: totalGuests ? 'HIGH' : 'LOW', sources: ['POS'] },
                    lbsConsumed: { value: diningRoomLbs, confidence: 'HIGH', sources: ['ProteinConsumptionAllocation'] },
                    lbsPerGuest: lbsPerGuest,
                    lossPerGuest: lossPerGuest
                },
                barALaCarte: {
                    lbsConsumed: { value: 120, confidence: 'HIGH', sources: ['ProteinConsumptionAllocation'] },
                    proteinCostAllocated: { value: 1400, confidence: 'MEDIUM', sources: ['ProteinConsumptionAllocation', 'AverageCostMetrics'] },
                    topItemImpact: 'BEEF_RIBS'
                },
                deliveryOLO: {
                    lbsConsumed: { value: 45, confidence: 'HIGH', sources: ['ProteinConsumptionAllocation'] },
                    proteinCostAllocated: { value: 650, confidence: 'MEDIUM', sources: ['ProteinConsumptionAllocation', 'AverageCostMetrics'] },
                    deliveryFoodCostPercent: { value: null, confidence: 'LOW', sources: ['POS_REVENUE'], reasonIfNull: 'OLO_REVENUE_FEED_DELAYED' }
                }
            },
            recommendedActions
        };
    }

    // -- Private Mocks for Demonstration --
    private static async getPosGuestsMock(storeId?: number) { return 450; } // Will be retrieved from PosSalesFeed aggregated
    private static async getDiningRoomLbsMock(storeId?: number) { return 1100; }
    private static async getOpenVariancesUsdMock(storeId?: number) { return 1200; }
}
