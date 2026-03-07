
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { MEAT_UNIT_WEIGHTS } from '../config/meat_weights';
import { MEAT_STANDARDS } from '../config/standards';
import { MEAT_COSTS_LB, FINANCIAL_TARGET_GUEST, FINANCIAL_TOLERANCE_THRESHOLD } from '../config/costs';

import { HolidayPredictorAgent } from '../agents/HolidayPredictorAgent';

const prisma = new PrismaClient();

const VILLAINS = ['Picanha', 'Picanha with Garlic', 'Lamb Picanha', 'Beef Ribs', 'Lamb Chops', 'Filet Mignon', 'Filet Mignon with Bacon', 'Fraldinha', 'Flap Steak'];

export class SmartPrepController {

    static async getNetworkPrepStatus(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const today = new Date();
            const centralNow = SmartPrepController.getCentralDateTime(today);
            const dateStr = req.query.date as string || centralNow.toISOString().split('T')[0];
            const date = new Date(dateStr);

            let stores = [];
            if (user.role === 'admin') {
                stores = await prisma.store.findMany({
                    select: { id: true, store_name: true, location: true },
                    orderBy: { store_name: 'asc' }
                });
            } else {
                stores = await prisma.store.findMany({
                    where: { company_id: user.companyId },
                    select: { id: true, store_name: true, location: true },
                    orderBy: { store_name: 'asc' }
                });
            }

            const logs = await (prisma as any).prepLog.findMany({
                where: { date: date },
                select: { store_id: true, forecast: true, created_at: true, data: true }
            });

            let totalPredictedCost = 0;
            let storesWithCost = 0;

            const statusGrid = stores.map(store => {
                const log = logs.find((l: any) => l.store_id === store.id);
                const logData = log?.data as any;

                if (logData?.predicted_cost_guest) {
                    totalPredictedCost += logData.predicted_cost_guest;
                    storesWithCost++;
                }

                return {
                    id: store.id,
                    name: store.store_name,
                    location: store.location,
                    is_locked: !!log,
                    forecast: log ? log.forecast : null,
                    submitted_at: log ? log.created_at : null,
                    predicted_cost_guest: logData?.predicted_cost_guest || null,
                    target_lbs_guest: logData?.target_lbs_guest || null
                };
            });

            const companyAvgCost = storesWithCost > 0 ? (totalPredictedCost / storesWithCost) : null;

            return res.json({
                date: dateStr,
                total_stores: stores.length,
                submitted_count: logs.length,
                company_avg_cost_guest: companyAvgCost ? parseFloat(companyAvgCost.toFixed(2)) : null,
                stores: statusGrid
            });

        } catch (error) {
            console.error('Network Prep Status Error:', error);
            return res.status(500).json({ error: 'Failed to fetch network prep status', details: String(error) });
        }
    }

    static async getDailyPrep(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const userId = user.userId;
            const userRole = user.role;
            let userStoreId = user.store_id;
            if (!userStoreId) {
                const firstStore = await prisma.store.findFirst({ where: { company_id: user.companyId } });
                userStoreId = firstStore ? firstStore.id : 1;
            }

            let storeId = userStoreId;
            if (['admin', 'director', 'owner'].includes(userRole) && req.query.store_id) {
                storeId = parseInt(req.query.store_id as string);
            }

            // Verify store belongs to company
            let storeLookup = null;
            if (userRole === 'admin') {
                storeLookup = await prisma.store.findFirst({ where: { id: storeId } });
            } else {
                storeLookup = await prisma.store.findFirst({
                    where: { id: storeId, company_id: user.companyId }
                });
            }

            if (!storeLookup) {
                return res.status(403).json({ error: 'Access Denied: Store not found or belongs to another company.' });
            }

            const today = new Date();
            const centralNow = SmartPrepController.getCentralDateTime(today);
            const dateStr = req.query.date as string || centralNow.toISOString().split('T')[0];
            const date = new Date(dateStr + 'T00:00:00Z');
            const dayOfWeek = date.getDay();

            const savedLog = await (prisma as any).prepLog.findFirst({
                where: { store_id: storeId, date: date }
            });

            if (savedLog) {
                const savedData = savedLog.data as any;
                // Auto-healer for corrupted DB payloads
                if (!savedData?.prep_list || savedData.prep_list.length === 0) {
                    await (prisma as any).prepLog.delete({ where: { id: savedLog.id } });
                    // Proceed to recalculate
                } else {
                    return res.json({
                        store_name: storeLookup.store_name,
                        date: dateStr,
                        forecast_guests: savedLog.forecast,
                        ...savedData,
                        is_locked: true,
                        locked_by: savedLog.user_id,
                        locked_at: savedLog.created_at
                    });
                }
            }

            const store = await (prisma.store as any).findUnique({
                where: { id: storeId },
                include: { meat_targets: true }
            });

            if (!store) return res.status(404).json({ error: 'Store not found' });

            // Fetch Company Products to align with Governance standards
            const products = await (prisma.companyProduct as any).findMany({
                where: { company_id: store.company_id }
            });

            // SHIFT-AWARE LBS TARGET
            const targetLbsPerGuest = (store as any).target_lbs_guest || 1.76;
            const lunchTargetLbsPerGuest = store.lunch_target_lbs_guest || 1.76;
            const targetCostPerGuest = (store as any).target_cost_guest || 9.94;

            // Auto-Suggest Logic (Historical Average for the same Day of Week)
            const fourWeeksAgoHist = new Date(date);
            fourWeeksAgoHist.setDate(fourWeeksAgoHist.getDate() - 28);

            const historicalLogs = await (prisma as any).prepLog.findMany({
                where: {
                    store_id: storeId,
                    date: { gte: fourWeeksAgoHist, lte: date }
                }
            });

            // Filter by exact day of week, excluding today's date if it already exists
            const sameDayLogs = historicalLogs.filter((log: any) => new Date(log.date).getDay() === dayOfWeek && log.date.getTime() !== date.getTime());

            let sumLunch = 0, countLunch = 0;
            let sumDinner = 0, countDinner = 0;

            sameDayLogs.forEach((log: any) => {
                const data = log.data || {};
                if (data.lunch_forecast) { sumLunch += data.lunch_forecast; countLunch++; }
                if (data.dinner_forecast) { sumDinner += data.dinner_forecast; countDinner++; }
                // fallback for older logs
                if (!data.lunch_forecast && !data.dinner_forecast && log.forecast) {
                    sumDinner += log.forecast; countDinner++;
                }
            });

            const baseForecast = 120 + (dayOfWeek * 25);
            let suggestedLunch = countLunch > 0 ? Math.round(sumLunch / countLunch) : (store.is_lunch_enabled ? Math.round(baseForecast * 0.4) : 0);
            let suggestedDinner = countDinner > 0 ? Math.round(sumDinner / countDinner) : Math.round(baseForecast * (store.is_lunch_enabled ? 0.6 : 1.0));

            let holidayInsight = null;
            const prediction = await HolidayPredictorAgent.getHolidayForecast({
                country: store.country || 'USA',
                city: store.city || null,
                targetDate: dateStr,
                historicalLunchAvg: suggestedLunch,
                historicalDinnerAvg: suggestedDinner
            });

            if (prediction?.holiday_insight) {
                suggestedLunch = prediction.suggested_lunch_guests;
                suggestedDinner = prediction.suggested_dinner_guests;
                holidayInsight = prediction.holiday_insight;
            }

            const lunchGuests = req.query.lunchGuests ? parseInt(req.query.lunchGuests as string) : suggestedLunch;
            const dinnerGuests = req.query.dinnerGuests ? parseInt(req.query.dinnerGuests as string) : suggestedDinner;

            // Total guests for backward compatibility in reporting
            const forecast = lunchGuests + dinnerGuests;

            // Rank current shift
            let isDinner = true;
            if (store.lunch_start_time && store.lunch_end_time) {
                const hour = centralNow.getHours();
                const lunchEndHour = parseInt(store.lunch_end_time.split(':')[0]);
                if (hour < lunchEndHour) isDinner = false;
            }

            // APPLY SAFETY BUFFER (+20% for Dinner Walk-ins)
            const lunchDineInLbs = (lunchGuests * 1.0) * lunchTargetLbsPerGuest; // Lunch uses 1.0 buffer (no 20% bump)
            const dinnerDineInLbs = (dinnerGuests * 1.20) * targetLbsPerGuest; // Dinner uses 1.20 buffer
            const dineInMeatLbs = lunchDineInLbs + dinnerDineInLbs;

            // [DELIVERY FORECAST BUFFER LOGIC]
            // We need to anticipate UberEats/OLO orders by looking at historical data
            const fourWeeksAgo = new Date(date);
            fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

            // Note: In a production scenario with sufficient data, we'd query exactly the same day of week over 4 weeks.
            // For now, we fetch the total delivery of the last 28 days and average it to a daily rate to prevent zero-buffers.
            const pastDeliveries = await prisma.deliverySale.findMany({
                where: {
                    store_id: storeId,
                    created_at: { gte: fourWeeksAgo, lte: date }
                }
            });
            const totalPastDeliveryLbs = pastDeliveries.reduce((acc, sale) => acc + (sale.total_lbs || 0), 0);

            // Average daily delivery volume (or use a placeholder if empty for demo purposes)
            let deliveryBufferLbs = (totalPastDeliveryLbs / 28) || 0;
            if (deliveryBufferLbs === 0 && storeId === 1) {
                deliveryBufferLbs = isDinner ? 45.5 : 22.0; // Demo fallback if DB has no historical delivery sales yet
            }

            const totalMeatLbs = dineInMeatLbs + deliveryBufferLbs;

            const prepList = [];

            // FILTER: Remove discontinued items (Alcatra, Bone-in Ribeye) as per Texas de Brazil standards
            const DISCONTINUED = ['Alcatra', 'Bone-in Ribeye'];

            // Fetch global dinner-only exclusions from CompanyProduct
            const DINNER_ONLY_MEATS = products.filter((p: any) => p.is_dinner_only).map((p: any) => p.name.toLowerCase());

            // Store specific lunch exclusions (e.g. Tampa excluding Ribs at lunch)
            const lunchExcluded = store.lunch_excluded_proteins || [];

            // Compile the final list of proteins
            let allProteins = Object.keys(MEAT_UNIT_WEIGHTS).filter(p => !DISCONTINUED.includes(p));

            // Global exclusion: block Lamb Chops entirely if the store doesn't serve them in Rodizio
            if (store.serves_lamb_chops_rodizio === false) {
                allProteins = allProteins.filter(p => !p.toLowerCase().includes('lamb chops'));
            }

            let totalPredictedCost = 0;
            const meatTargets = (store as any).meat_targets || [];

            for (const protein of allProteins) {
                const lName = protein.toLowerCase();
                const isDinnerOnly = DINNER_ONLY_MEATS.includes(lName) || (Array.isArray(lunchExcluded) && lunchExcluded.includes(protein));

                let mixPercentage = 0;
                const specificOverride = meatTargets.find((t: any) => t.protein === protein);

                if (specificOverride) {
                    mixPercentage = specificOverride.target / targetLbsPerGuest;
                } else {
                    const stdVal = MEAT_STANDARDS[protein] || 0;
                    mixPercentage = stdVal / 1.76;
                }

                // PARETO TAGGING
                const isVillain = VILLAINS.some(v => protein.includes(v));

                let neededLbs = 0;

                // Lunch Math
                if (store.is_lunch_enabled && !isDinnerOnly) {
                    let lunchMixPercentage = mixPercentage;
                    if (specificOverride) {
                        // Rescale override target relative to lunch target
                        lunchMixPercentage = specificOverride.target / lunchTargetLbsPerGuest;
                    }
                    neededLbs += lunchDineInLbs * lunchMixPercentage;
                }

                // Dinner Math
                neededLbs += dinnerDineInLbs * mixPercentage;

                // Delivery Math (applies to mix)
                neededLbs += deliveryBufferLbs * mixPercentage;

                if (neededLbs <= 0) continue;

                const costLb = MEAT_COSTS_LB[protein] || 6.00;
                totalPredictedCost += neededLbs * costLb;

                let unitWeight = MEAT_UNIT_WEIGHTS[protein] || 1;
                let unitName = 'Piece/Whole';

                if (protein === 'Chicken Breast') {
                    const piecesPerSkewer = forecast > 400 ? 10 : 9;
                    unitWeight = (piecesPerSkewer * 0.125) / 0.95;
                    unitName = 'Skewers';
                } else if (protein.includes('Filet') || protein.includes('Tenderloin')) {
                    unitWeight = 2.0;
                    unitName = 'Skewers';
                } else if (protein === 'Sausage') {
                    unitWeight = 2.4;
                    unitName = 'Skewers';
                } else if (protein === 'Chicken Drumstick') {
                    unitWeight = 2.25;
                    unitName = 'Skewers';
                } else if (protein.includes('Picanha')) {
                    if (protein.includes('Garlic')) {
                        unitWeight = 2.4;
                    } else if (protein.includes('Lamb')) {
                        unitWeight = 1.5;
                    } else {
                        unitWeight = 3.5;
                    }
                    unitName = 'Skewers';
                } else if (protein === 'Lamb Chops') {
                    unitWeight = 1.6;
                    unitName = 'Skewers';
                } else if (protein.includes('Pork Loin')) {
                    unitWeight = 1.8;
                    unitName = 'Skewers';
                } else if (protein.includes('Pork Ribs')) {
                    unitWeight = 3.0;
                    unitName = 'Skewers';
                } else if (protein.includes('Beef Ribs')) {
                    unitWeight = MEAT_UNIT_WEIGHTS['Beef Ribs'] || 5.0; // Dynamic from weights
                    unitName = 'Ribs';
                } else if (protein.includes('Fraldinha') || protein.includes('Flap')) {
                    unitWeight = 2.5;
                    unitName = 'Skewers';
                } else if (protein.includes('Tri-Tip') || protein.includes('Spicy Sirloin')) {
                    unitWeight = 2.5;
                    unitName = 'Skewers';
                } else if (protein.includes('Leg of Lamb')) {
                    unitWeight = 4.0;
                    unitName = 'Skewers';
                } else if (unitWeight > 1.5) {
                    unitName = 'Skewers';
                }

                const neededUnits = neededLbs / unitWeight;

                prepList.push({
                    protein,
                    unit_name: unitName,
                    avg_weight: parseFloat(unitWeight.toFixed(2)),
                    mix_percentage: (mixPercentage * 100).toFixed(1) + '%',
                    recommended_lbs: parseFloat(neededLbs.toFixed(2)),
                    recommended_units: Math.ceil(neededUnits),
                    cost_lb: costLb,
                    is_villain: isVillain
                });
            }

            const predictedCostGuest = totalPredictedCost / forecast;
            const toleranceThreshold = targetCostPerGuest + 0.05;

            let tacticalBriefing = "";
            if (predictedCostGuest > toleranceThreshold) {
                tacticalBriefing = `Financial Risk Identified: Predicted cost ($${predictedCostGuest.toFixed(2)}) is above the cap of $${toleranceThreshold.toFixed(2)}. PARETO ALERT: Focus strictly on VILLAINS (Picanha/Ribs) output control. Delivery Forecast Volume Anticipated: +${deliveryBufferLbs.toFixed(1)} Lbs.`;
            } else if (predictedCostGuest > targetCostPerGuest) {
                tacticalBriefing = `Attention: Tight margin ($${predictedCostGuest.toFixed(2)}). Your target is $${targetCostPerGuest.toFixed(2)}. Monitor Villain prep carefully. Delivery Forecast Volume Anticipated: +${deliveryBufferLbs.toFixed(1)} Lbs.`;
            } else {
                tacticalBriefing = `Financial Goal OK ($${predictedCostGuest.toFixed(2)}). Buffer for Walk-ins included if applicable. Delivery Forecast Volume Anticipated: +${deliveryBufferLbs.toFixed(1)} Lbs.`;
            }

            prepList.sort((a, b) => b.recommended_lbs - a.recommended_lbs);

            return res.json({
                store_id: storeId,
                store_name: store.store_name,
                date: dateStr,
                forecast_guests: forecast,
                suggested_lunch_guests: suggestedLunch,
                suggested_dinner_guests: suggestedDinner,
                lunch_forecast: lunchGuests,
                dinner_forecast: dinnerGuests,
                is_lunch_enabled: store.is_lunch_enabled,
                target_lbs_guest: targetLbsPerGuest,
                predicted_cost_guest: parseFloat(predictedCostGuest.toFixed(2)),
                financial_target: FINANCIAL_TARGET_GUEST,
                tactical_briefing: tacticalBriefing,
                prep_list: prepList
            });

            // The catch block should be outside the if/else if/else structure
            // but still within the try block of the method.
            // The original code had the catch block misplaced, making the final 'else' block
            // appear to be followed by the catch block directly.
            // The fix is to ensure the if/else if/else structure is fully closed
            // before the catch block.
        } catch (error: any) {
            console.error('Smart Prep Error:', error);
            return res.status(500).json({ error: 'Failed to generate prep list: ' + (error?.message || String(error)) });
        }
    }

    static async lockPrepPlan(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const userId = user.userId;
            const { store_id, date, forecast, lunch_forecast, dinner_forecast, data } = req.body;

            if (!store_id || !date || (!forecast && Number.isNaN(lunch_forecast + dinner_forecast)) || !data) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const targetStoreId = parseInt(store_id);
            const totalForecast = parseInt(forecast) || (parseInt(lunch_forecast || 0) + parseInt(dinner_forecast || 0));

            // Date parsing fix (must match exactly the zero-time UTC object created in getDailyPrep)
            const targetDateStr = String(date).split('T')[0];
            const targetDate = new Date(targetDateStr + 'T00:00:00Z');

            // Verify store belongs to company
            let store = null;
            if (user.role === 'admin') {
                store = await prisma.store.findFirst({ where: { id: targetStoreId } });
            } else {
                store = await prisma.store.findFirst({
                    where: { id: targetStoreId, company_id: user.companyId }
                });
            }

            if (!store) {
                return res.status(403).json({ error: 'Access Denied: Store not found or belongs to another company.' });
            }

            const existing = await (prisma as any).prepLog.findFirst({
                where: { store_id: targetStoreId, date: targetDate }
            });

            if (existing) {
                return res.status(400).json({ error: 'This day is already locked for this store.' });
            }

            await (prisma as any).prepLog.create({
                data: {
                    store_id: targetStoreId,
                    date: targetDate,
                    forecast: totalForecast,
                    data: {
                        lunch_forecast: lunch_forecast ? parseInt(lunch_forecast) : null,
                        dinner_forecast: dinner_forecast ? parseInt(dinner_forecast) : null,
                        prep_list: data.prep_list,
                        target_lbs_guest: data.target_lbs_guest,
                        predicted_cost_guest: data.predicted_cost_guest,
                        tactical_briefing: data.tactical_briefing
                    },
                    user_id: userId
                }
            });

            res.json({ success: true });
        } catch (error) {
            console.error('Lock Prep Error:', error);
            res.status(500).json({ error: 'Failed to lock prep plan' });
        }
    }

    private static getCentralDateTime(now: Date): Date {
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        return new Date(utc + (3600000 * -6));
    }
}
