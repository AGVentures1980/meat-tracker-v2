
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { MEAT_UNIT_WEIGHTS } from '../config/meat_weights';
import { MEAT_STANDARDS } from '../config/standards';
import { MEAT_COSTS_LB, FINANCIAL_TARGET_GUEST, FINANCIAL_TOLERANCE_THRESHOLD } from '../config/costs';

const prisma = new PrismaClient();

export class SmartPrepController {

    static async getNetworkPrepStatus(req: Request, res: Response) {
        try {
            const today = new Date();
            const centralNow = SmartPrepController.getCentralDateTime(today);
            const dateStr = req.query.date as string || centralNow.toISOString().split('T')[0];
            const date = new Date(dateStr);

            const stores = await prisma.store.findMany({
                select: { id: true, store_name: true, location: true },
                orderBy: { store_name: 'asc' }
            });

            const logs = await (prisma as any).prepLog.findMany({
                where: { date: date },
                select: { store_id: true, forecast: true, created_at: true }
            });

            const statusGrid = stores.map(store => {
                const log = logs.find((l: any) => l.store_id === store.id);
                return {
                    id: store.id,
                    name: store.store_name,
                    location: store.location,
                    is_locked: !!log,
                    forecast: log ? log.forecast : null,
                    submitted_at: log ? log.created_at : null
                };
            });

            return res.json({
                date: dateStr,
                total_stores: stores.length,
                submitted_count: logs.length,
                stores: statusGrid
            });

        } catch (error) {
            console.error('Network Prep Status Error:', error);
            return res.status(500).json({ error: 'Failed to fetch network prep status' });
        }
    }

    static async getDailyPrep(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId;
            // @ts-ignore
            const userRole = req.user.role;
            // @ts-ignore
            const userStoreId = req.user.store_id || 1;

            let storeId = userStoreId;
            if ((userRole === 'admin' || userRole === 'director')) {
                if (req.query.store_id) {
                    storeId = parseInt(req.query.store_id as string);
                } else {
                    storeId = 1;
                }
            }

            const today = new Date();
            const centralNow = SmartPrepController.getCentralDateTime(today);
            const dateStr = req.query.date as string || centralNow.toISOString().split('T')[0];
            const date = new Date(dateStr);
            const dayOfWeek = date.getDay();

            const savedLog = await (prisma as any).prepLog.findUnique({
                where: { store_id_date: { store_id: storeId, date: date } }
            });

            if (savedLog) {
                const store = await prisma.store.findUnique({ where: { id: storeId } });
                return res.json({
                    store_name: store?.store_name || 'Store',
                    date: dateStr,
                    forecast_guests: savedLog.forecast,
                    ...(savedLog.data as any),
                    is_locked: true,
                    locked_by: savedLog.user_id,
                    locked_at: savedLog.created_at
                });
            }

            const store = await (prisma.store as any).findUnique({
                where: { id: storeId },
                include: { meat_targets: true }
            });

            if (!store) return res.status(404).json({ error: 'Store not found' });

            const TARGET_OVERRIDES: Record<number, number> = {
                1: 1.76, 2: 1.85, 3: 1.95, 4: 1.65, 5: 2.10
            };
            const targetLbsPerGuest = TARGET_OVERRIDES[storeId] || (store as any).target_lbs_guest || 1.76;

            let forecast = 150;
            if (req.query.guests) {
                forecast = parseInt(req.query.guests as string);
            } else {
                const baseForecast = 120;
                forecast = baseForecast + (dayOfWeek * 25);
            }

            const totalMeatLbs = forecast * targetLbsPerGuest;
            const prepList = [];
            const proteins = Object.keys(MEAT_UNIT_WEIGHTS);

            let totalPredictedCost = 0;

            for (const protein of proteins) {
                let mixPercentage = 0;
                const meatTargets = (store as any).meat_targets || [];
                const specificOverride = meatTargets.find((t: any) => t.protein === protein);

                if (specificOverride) {
                    mixPercentage = specificOverride.target / targetLbsPerGuest;
                } else {
                    const stdVal = MEAT_STANDARDS[protein] || 0;
                    mixPercentage = stdVal / 1.76;
                }

                const neededLbs = totalMeatLbs * mixPercentage;
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
                } else if (protein.includes('Ribs')) {
                    unitWeight = protein.includes('Beef') ? 4.0 : 3.0;
                    unitName = protein.includes('Beef') ? 'Ribs' : 'Skewers';
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
                    cost_lb: costLb
                });
            }

            const predictedCostGuest = totalPredictedCost / forecast;

            let tacticalBriefing = "";
            if (predictedCostGuest > FINANCIAL_TOLERANCE_THRESHOLD) {
                tacticalBriefing = `Risco Financeiro Identificado: Custo previsto ($${predictedCostGuest.toFixed(2)}) está acima do teto de $${FINANCIAL_TOLERANCE_THRESHOLD}. Instrua a equipe a cadenciar a saída de carnes Premium (Tenderloin/Lamb) e acelerar cortes de eficiência (Coxinha/Lombo).`;
            } else if (predictedCostGuest > FINANCIAL_TARGET_GUEST) {
                tacticalBriefing = `Atenção: Margem apertada ($${predictedCostGuest.toFixed(2)}). Monitore o mix de carnes caras para evitar ultrapassar o teto semanal.`;
            } else {
                tacticalBriefing = `Meta Financeira OK: Custo previsto de $${predictedCostGuest.toFixed(2)} por cliente está dentro do alvo de $${FINANCIAL_TARGET_GUEST}. Margem operacional confortável.`;
            }

            prepList.sort((a, b) => b.recommended_lbs - a.recommended_lbs);

            return res.json({
                store_name: store.store_name,
                date: dateStr,
                forecast_guests: forecast,
                target_lbs_guest: targetLbsPerGuest,
                predicted_cost_guest: parseFloat(predictedCostGuest.toFixed(2)),
                financial_target: FINANCIAL_TARGET_GUEST,
                tactical_briefing: tacticalBriefing,
                prep_list: prepList
            });

        } catch (error) {
            console.error('Smart Prep Error:', error);
            return res.status(500).json({ error: 'Failed to generate prep list' });
        }
    }

    static async lockPrepPlan(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId;
            const { store_id, date, forecast, data } = req.body;

            if (!store_id || !date || !forecast || !data) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const existing = await (prisma as any).prepLog.findUnique({
                where: { store_id_date: { store_id: parseInt(store_id), date: new Date(date) } }
            });

            if (existing) {
                return res.status(400).json({ error: 'This day is already locked for this store.' });
            }

            await (prisma as any).prepLog.create({
                data: {
                    store_id: parseInt(store_id),
                    date: new Date(date),
                    forecast: parseInt(forecast),
                    data: {
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
