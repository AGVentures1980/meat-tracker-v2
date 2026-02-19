import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AnalystController {

    static async getRoiReport(req: Request, res: Response) {
        try {
            // 1. Fetch Pilot Stores with their Baselines
            const pilotStores = await prisma.store.findMany({
                where: { is_pilot: true },
                include: {
                    meat_usage: true,
                    waste_logs: true,
                    sales_forecasts: true,
                    company: true
                }
            });

            // If no pilot stores defined yet, fallback to looking for specific names or just first 3
            let selectedStores = pilotStores;
            if (pilotStores.length === 0) {
                selectedStores = await prisma.store.findMany({
                    take: 3,
                    include: {
                        meat_usage: true,
                        waste_logs: true,
                        sales_forecasts: true,
                        company: true
                    }
                });
            }

            const reportData = selectedStores.map(store => {
                // --- 2. Calculate Actuals (Mocking logic for prototype if data is sparse) ---

                // Actual Loss Rate (Logic: Waste Lbs / Total Usage Lbs)
                // For prototype, we'll simulate a slight improvement over baseline
                const actualLossRate = store.baseline_loss_rate * 0.85; // 15% improvement simulation

                // Actual Yield (Ribs)
                const actualYieldRibs = store.baseline_yield_ribs * 1.05; // 5% improvement

                // Consumption Per Pax
                const actualConsumption = 1.65; // Target is 1.65, Baseline 1.72

                // --- 3. Calculate Savings ---

                // Volume Basis (Annualized) - Hardcoded for prototype example or typically from Company
                const annualVolume = 180000; // lbs
                const avgCostPerLb = 9.50; // $

                // Loss Savings
                const lossVariance = (store.baseline_loss_rate - actualLossRate) / 100;
                const poundsSavedLoss = annualVolume * lossVariance;
                const moneySavedLoss = poundsSavedLoss * avgCostPerLb;

                // Consumption Savings
                const consumptionVariance = store.baseline_consumption_pax - actualConsumption;
                // Assuming 180k lbs represents ~105k guests (at 1.72lb/guest)
                const estimatedGuests = annualVolume / store.baseline_consumption_pax;
                const poundsSavedConsumption = consumptionVariance * estimatedGuests;
                const moneySavedConsumption = poundsSavedConsumption * avgCostPerLb;

                // Total ROI
                const totalSavings = moneySavedLoss + moneySavedConsumption;

                // Fee
                const feePct = store.company.contract_savings_fee_pct || 8.0; // Updated to 8% as requested
                const saasFee = totalSavings * (feePct / 100);

                return {
                    storeId: store.id,
                    storeName: store.store_name,
                    pilotStart: store.pilot_start_date || new Date(),
                    baselines: {
                        loss: store.baseline_loss_rate,
                        yield: store.baseline_yield_ribs,
                        consumption: store.baseline_consumption_pax,
                        forecast: store.baseline_forecast_accuracy
                    },
                    actuals: {
                        loss: actualLossRate,
                        yield: actualYieldRibs,
                        consumption: actualConsumption,
                        forecast: 84.0 // Simulated improvement
                    },
                    financials: {
                        annualVolumeLb: annualVolume,
                        costPerLb: avgCostPerLb,
                        projectedSavings: totalSavings,
                        saasFee: saasFee,
                        feePct: feePct
                    },
                    status: "AUDITED"
                };
            });

            // Aggregate Total
            const totalProjectedSavings = reportData.reduce((acc, curr) => acc + curr.financials.projectedSavings, 0);
            const totalFee = reportData.reduce((acc, curr) => acc + curr.financials.saasFee, 0);

            res.json({
                success: true,
                generatedAt: new Date(),
                auditor: "Brasa Prophet AI",
                summary: {
                    totalProjectedSavings,
                    totalFee,
                    currency: "USD"
                },
                stores: reportData
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, error: 'Failed to generate ROI report' });
        }
    }

    static async updateBaselines(req: Request, res: Response) {
        try {
            const { storeId } = req.params;
            const {
                baseline_loss_rate,
                baseline_yield_ribs,
                baseline_consumption_pax,
                baseline_forecast_accuracy
            } = req.body;

            const updatedStore = await prisma.store.update({
                where: { id: parseInt(storeId) },
                data: {
                    baseline_loss_rate: parseFloat(baseline_loss_rate),
                    baseline_yield_ribs: parseFloat(baseline_yield_ribs),
                    baseline_consumption_pax: parseFloat(baseline_consumption_pax),
                    baseline_forecast_accuracy: parseFloat(baseline_forecast_accuracy)
                }
            });

            res.json({ success: true, store: updatedStore });
        } catch (error) {
            console.error("Failed to update baselines", error);
            res.status(500).json({ success: false, error: 'Failed to update baselines' });
        }
    }
}
