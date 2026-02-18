import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { MeatEngine } from '../engine/MeatEngine';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';

const prisma = new PrismaClient();

export class AnalystController {
    /**
     * GET /api/v1/analyst/scan
     * Performs a full system scan and generates executive insights.
     */
    static async getDeepAnalysis(req: Request, res: Response) {
        try {
            const timeframe = (req.query.timeframe as string) || 'M';
            const now = new Date();
            let start: Date, end: Date;

            switch (timeframe) {
                case 'W':
                    start = startOfWeek(now);
                    end = endOfWeek(now);
                    break;
                case 'Q':
                    start = startOfQuarter(now);
                    end = endOfQuarter(now);
                    break;
                case 'Y':
                    start = startOfYear(now);
                    end = endOfYear(now);
                    break;
                default:
                    start = startOfMonth(now);
                    end = endOfMonth(now);
            }

            // 1. Fetch Executive Stats
            const stats = await MeatEngine.getExecutiveStats((req as any).user);
            const performance = stats.performance;

            // 2. Identify Nuclear Problems
            const problems = [];

            // Problem A: Top Spenders (Financial Drag)
            const topSpenders = performance.filter(s => s.impactYTD > 5000).slice(0, 3);
            if (topSpenders.length > 0) {
                problems.push({
                    id: 'FIN_DRAG',
                    title: 'prob_fin_drag_title',
                    severity: 'Critical',
                    locations: topSpenders.map(s => s.name),
                    description: 'prob_fin_drag_desc',
                    solution: 'prob_fin_drag_sol'
                });
            }

            // Problem B: Consumption Anomaly
            const consumptionOutliers = performance.filter(s => s.lbsGuestVar > 0.2).slice(0, 3);
            if (consumptionOutliers.length > 0) {
                problems.push({
                    id: 'CONS_ANOMALY',
                    title: 'prob_cons_anomaly_title',
                    severity: 'High',
                    locations: consumptionOutliers.map(s => s.name),
                    description: 'prob_cons_anomaly_desc',
                    solution: 'prob_cons_anomaly_sol'
                });
            }

            // 3. Strategic Recommendations
            const recommendations = [
                {
                    area: 'rec_area_neg_power',
                    action: 'rec_action_neg_power',
                    impact: 'rec_impact_neg_power'
                },
                {
                    area: 'rec_area_op_eff',
                    action: 'rec_action_op_eff',
                    impact: 'rec_impact_op_eff'
                }
            ];

            return res.json({
                success: true,
                scanMetadata: {
                    timeframe,
                    range: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
                    month: now.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
                    totalStoresScanned: performance.length
                },
                insights: {
                    nuclearProblems: problems,
                    recommendations,
                    summaryBriefing: {
                        criticalAlerts: problems.length,
                        // Real savings: sum of absolute impactYTD for stores under target (negative = saving)
                        projectedMonthlySavings: performance
                            .filter((s: any) => s.impactYTD < 0)
                            .reduce((acc: number, s: any) => acc + Math.abs(s.impactYTD), 0),
                        // Real loss: sum of impactYTD for stores over target (positive = overspend)
                        projectedMonthlyLoss: performance
                            .filter((s: any) => s.impactYTD > 0)
                            .reduce((acc: number, s: any) => acc + s.impactYTD, 0),
                        systemHealth: performance.filter((s: any) => s.status === 'Optimal').length / performance.length * 100
                    }
                },
                matrix: performance // Full data for the spreadsheet view
            });

        } catch (error) {
            console.error('Deep Analysis Failed:', error);
            return res.status(500).json({ success: false, error: 'Executive Scan Failed' });
        }
    }
}
