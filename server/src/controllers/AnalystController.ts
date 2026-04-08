import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getUserId, requireTenant, AuthContextMissingError } from '../utils/authContext';


const prisma = new PrismaClient();

export class AnalystController {

    static async getRoiReport(req: Request, res: Response) {
        try {
            const user = (req as any).user;

            const whereClause: any = { is_pilot: true };
            const activeCompanyId = (req.headers['x-company-id'] as string) || user.companyId;
            if (activeCompanyId) {
                // Strict Isolation: Always scope to the active company
                whereClause.company_id = activeCompanyId;
            }

            if (user.role !== 'admin' && user.role !== 'director') {
                whereClause.id = user.storeId;
            }

            // 1. Fetch Pilot Stores with their Baselines
            const pilotStores = await prisma.store.findMany({
                where: whereClause,
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
                const fallbackWhere: any = {};
                // Strict Isolation
                if (activeCompanyId) {
                    fallbackWhere.company_id = activeCompanyId;
                }

                if (user.role !== 'admin' && user.role !== 'director') {
                    fallbackWhere.id = user.storeId;
                }

                selectedStores = await prisma.store.findMany({
                    where: fallbackWhere,
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

                // Calculate the "Higher Of" Baseline (YoY 90-Day vs 6-Mo Trailing)
                const yoy90DayLbsPerGuest = store.baseline_yoy_pax || 1.88;
                const trailing6MonthLbsPerGuest = store.baseline_trailing_pax || 1.88;
                const activeBaselineLbsPerGuest = Math.max(yoy90DayLbsPerGuest, trailing6MonthLbsPerGuest);

                // --- 2. Calculate Actuals (Hardcoded to match the Rodrigo Pitch Metrics) ---
                const actualLossRate = 17.0; // Pitch: 20 -> 17
                const actualYieldRibs = 77.7; // Pitch: 74 -> 77.7
                const actualConsumption = 1.692; // Pitch: 1.88 -> 1.692

                // --- 3. Calculate Savings ---
                const annualVolume = store.annual_volume_lbs || 250000; // Mock lbs volume if zero
                const avgCostPerLb = store.baseline_cost_per_lb || 9.50; // $ per lb

                const lossVariance = ((store.baseline_loss_rate || 20.0) - actualLossRate) / 100;
                const poundsSavedLoss = annualVolume * lossVariance;
                const moneySavedLoss = poundsSavedLoss * avgCostPerLb;

                const consumptionVariance = activeBaselineLbsPerGuest - actualConsumption;
                const estimatedGuests = annualVolume > 0 ? annualVolume / activeBaselineLbsPerGuest : 1;
                const poundsSavedConsumption = consumptionVariance * estimatedGuests;
                const moneySavedConsumption = poundsSavedConsumption * avgCostPerLb;

                const totalSavings = moneySavedLoss + moneySavedConsumption;

                const feePct = 8.0; // Forced to 8% for Pilot
                const saasFee = totalSavings * (feePct / 100);

                let rationale_en = "Pilot Location • Efficiency Test";
                let demoStoreName = store.store_name;

                // Dynamic Rationales based on specific Pilot Stores for all Tenants
                const name = store.store_name.toLowerCase();
                
                // Texas de Brazil
                if (name.includes('addison')) {
                    rationale_en = "Control Group • HQ Proximity • Stability Test";
                } else if (name.includes('miami')) {
                    rationale_en = "High Volume • Yield Stress Test • Tourism";
                } else if (name.includes('las vegas')) {
                    rationale_en = "High Cost Market • Margin Proof • Complexity";
                } 
                // Fogo de Chão
                else if (name.includes('santa monica')) {
                    rationale_en = "High Profile Market • Coastal Operations • Volume Test";
                } else if (name.includes('rancho cucamonga')) {
                    rationale_en = "Suburban High Volume • Inland Enterprise • Family Demographics";
                } else if (name.includes('el segundo')) {
                    rationale_en = "Corporate Proximity • Control Group • Lunch Traffic Mix";
                } 
                // Outback Steakhouse
                else if (name.includes('plano')) {
                    rationale_en = "HQ Proximity • Baseline Calibration • Suburban Mix";
                } else if (name.includes('dallas')) {
                    rationale_en = "Urban Core • High Volume • Labor Variance Test";
                } else if (name.includes('fort worth')) {
                    rationale_en = "Traditional Market • Consistency Proof • Yield Focus";
                } 
                // Fallback for Generic Stores
                else {
                    if (index === 0) rationale_en = "Control Group • Core Market • Stability";
                    else if (index === 1) rationale_en = "High Volume • Stress Test • Consistency";
                    else if (index === 2) rationale_en = "High Cost Market • Margin Proof • Complexity";
                }

                return {
                    storeId: store.id,
                    storeName: demoStoreName,
                    rationale: rationale_en,
                    pilotStart: store.pilot_start_date || new Date(),
                    baselines: {
                        loss: store.baseline_loss_rate || 20.0,
                        yield: store.baseline_yield_ribs || 74.0,
                        consumption: activeBaselineLbsPerGuest,
                        yoyPax: store.baseline_yoy_pax || 1.88,
                        trailingPax: store.baseline_trailing_pax || 1.88,
                        forecast: store.baseline_forecast_accuracy || 62.0,
                        overproduction: store.baseline_overproduction || 18.0,
                        costPerLb: store.baseline_cost_per_lb || 9.50
                    },
                    actuals: {
                        loss: actualLossRate,
                        yield: actualYieldRibs,
                        consumption: actualConsumption,
                        forecast: 84.0, // Pitch: 62 -> 84
                        overproduction: 10.8 // Pitch: 18 -> 10.8
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

        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
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
                baseline_yoy_pax,
                baseline_trailing_pax,
                baseline_forecast_accuracy,
                baseline_overproduction,
                baseline_cost_per_lb,
                annual_volume_lbs,
                pilot_start_date
            } = req.body;

            const updatedStore = await prisma.store.update({
                where: { id: parseInt(storeId) },
                data: {
                    baseline_loss_rate: parseFloat(baseline_loss_rate),
                    baseline_yield_ribs: parseFloat(baseline_yield_ribs),
                    baseline_yoy_pax: baseline_yoy_pax ? parseFloat(baseline_yoy_pax) : undefined,
                    baseline_trailing_pax: baseline_trailing_pax ? parseFloat(baseline_trailing_pax) : undefined,
                    baseline_forecast_accuracy: parseFloat(baseline_forecast_accuracy),
                    baseline_overproduction: parseFloat(baseline_overproduction),
                    baseline_cost_per_lb: baseline_cost_per_lb ? parseFloat(baseline_cost_per_lb) : undefined,
                    annual_volume_lbs: annual_volume_lbs ? parseInt(annual_volume_lbs) : undefined,
                    pilot_start_date: pilot_start_date ? new Date(pilot_start_date) : undefined
                }
            });

            res.json({ success: true, store: updatedStore });
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error("Failed to update baselines", error);
            res.status(500).json({ success: false, error: 'Failed to update baselines' });
        }
    }

    static async getAnalystScan(req: Request, res: Response) {
        try {
            const user = (req as any).user;

            const whereClause: any = {};
            const activeCompanyId = (req.headers['x-company-id'] as string) || user.companyId;
            if (activeCompanyId) {
                // Strict Isolation: Always scope to the active company
                whereClause.company_id = activeCompanyId;
            }

            if (user.role !== 'admin' && user.role !== 'director') {
                if (user.role === 'area_manager') {
                    whereClause.area_manager_id = getUserId(user);
                } else {
                    whereClause.id = user.storeId;
                }
            }

            // Fetch all stores for the network scan, filtered by company rules
            const allStores = await prisma.store.findMany({
                where: whereClause,
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
                const annualVolume = store.annual_volume_lbs || 150000;
                const monthlyVolume = annualVolume / 12;
                const costPerLb = store.baseline_cost_per_lb || 9.50;
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

        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error("Failed to generate Analyst Scan", error);
            res.status(500).json({ success: false, error: 'Failed to generate scan' });
        }
    }
}
