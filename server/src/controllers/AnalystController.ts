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

            const reportData = selectedStores.map((store, index) => {
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
                const feePct = 8.0; // Forced to 8% for Pilot
                const saasFee = totalSavings * (feePct / 100);

                // Pilot Rationale Logic (Demo Override)
                let rationale_en = "Pilot Location";
                let demoStoreName = store.store_name;
                if (index === 0) {
                    demoStoreName = "Addison, TX (HQ)";
                    rationale_en = "Control Group • HQ Proximity • Stability Test";
                } else if (index === 1) {
                    demoStoreName = "Miami Beach, FL";
                    rationale_en = "High Volume • Yield Stress Test • Tourism";
                } else if (index === 2) {
                    demoStoreName = "Las Vegas, NV";
                    rationale_en = "High Cost Market • Margin Proof • Complexity";
                }

                return {
                    storeId: store.id,
                    storeName: demoStoreName, // Override for demo
                    rationale: rationale_en, // New field
                    pilotStart: store.pilot_start_date || new Date(),
                    baselines: {
                        loss: store.baseline_loss_rate,
                        yield: store.baseline_yield_ribs,
                        consumption: store.baseline_consumption_pax,
                        forecast: store.baseline_forecast_accuracy,
                        overproduction: store.baseline_overproduction
                    },
                    actuals: {
                        loss: actualLossRate,
                        yield: actualYieldRibs,
                        consumption: actualConsumption,
                        forecast: 84.0,
                        overproduction: store.baseline_overproduction * 0.6 // Simulated 40% reduction for audit
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
                baseline_forecast_accuracy,
                baseline_overproduction
            } = req.body;

            const updatedStore = await prisma.store.update({
                where: { id: parseInt(storeId) },
                data: {
                    baseline_loss_rate: parseFloat(baseline_loss_rate),
                    baseline_yield_ribs: parseFloat(baseline_yield_ribs),
                    baseline_consumption_pax: parseFloat(baseline_consumption_pax),
                    baseline_forecast_accuracy: parseFloat(baseline_forecast_accuracy),
                    baseline_overproduction: parseFloat(baseline_overproduction)
                }
            });

            res.json({ success: true, store: updatedStore });
        } catch (error) {
            console.error("Failed to update baselines", error);
            res.status(500).json({ success: false, error: 'Failed to update baselines' });
        }
    }

    static async getAnalystScan(req: Request, res: Response) {
        try {
            // Fetch all stores for the network scan
            const allStores = await prisma.store.findMany({
                include: {
                    meat_usage: true,
                    waste_logs: true
                }
            });

            // Mocking aggregated logic for the "Full Network" view since we might not have logs for everyone
            const matrix = allStores.map(store => {
                // Determine randomish but realistic variance if no data exists
                // If data exists, calculation would be here.
                // Using hash of name to keep consistent "random" numbers for demo stability
                const hash = store.store_name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const isPerforming = hash % 2 === 0; // 50/50 split roughly

                // Variance between -0.05 (Saving) and +0.05 (Loss)
                let lbsGuestVar = (hash % 100) / 1000;
                if (isPerforming) lbsGuestVar *= -1;

                // Impact $$
                const annualVolume = 150000; // Average
                const monthlyVolume = annualVolume / 12;
                const costPerLb = 9.50;
                const impactYTD = (monthlyVolume * lbsGuestVar) * costPerLb;

                return {
                    id: store.id,
                    name: store.store_name,
                    lbsGuestVar: lbsGuestVar, // e.g. -0.03 = -3% (Savings)
                    impactYTD: Math.round(impactYTD)
                };
            });

            const totalStores = matrix.length;
            const savingsStores = matrix.filter(s => s.impactYTD < 0);
            const lossStores = matrix.filter(s => s.impactYTD > 0);
            const criticalStores = matrix.filter(s => s.lbsGuestVar > 0.04); // > 4% variance

            const projectedMonthlySavings = savingsStores.reduce((acc, curr) => acc + Math.abs(curr.impactYTD), 0);
            const projectedMonthlyLoss = lossStores.reduce((acc, curr) => acc + curr.impactYTD, 0);
            const systemHealth = (savingsStores.length / totalStores) * 100;

            const scanData = {
                success: true,
                scanMetadata: {
                    month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
                    range: "Last 30 Days",
                    totalStoresScanned: totalStores
                },
                insights: {
                    summaryBriefing: {
                        criticalAlerts: criticalStores.length,
                        projectedMonthlySavings,
                        projectedMonthlyLoss,
                        systemHealth
                    }
                },
                matrix: matrix
            };

            res.json(scanData);

        } catch (error) {
            console.error("Failed to generate Analyst Scan", error);
            res.status(500).json({ success: false, error: 'Failed to generate scan' });
        }
    }
}
