import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
import { SmartPrepController } from './SmartPrepController';

export class ProcurementIntelligenceController {

    // GET /api/v1/intelligence/procurement-shadow
    static async getShadowDashboardData(req: Request, res: Response) {
        try {
            const user = (req as any).user;

            // SECURITY GATE: Only allow Alexandre
            if (!user.email?.toLowerCase().includes('alexandre@alexgarciaventures.co') && !user.email?.toLowerCase().includes('alexandre@garciaventures.co')) {
                return res.status(403).json({ error: 'Access Denied: Exclusive Feature.' });
            }

            const today = new Date();
            // Workaround for private access: we'll just format manually for the query date
            const dateStr = req.query.date as string || today.toISOString().split('T')[0];
            const queryDate = new Date(dateStr + 'T00:00:00Z');

            // Isolation Enforcement: Require companyId for data fetching.
            // If the user hasn't selected a company (i.e. 'all'), we'll still default to targetCompanyId
            // but ideally we only want to fetch specific companies.
            const targetCompanyId = req.query.companyId as string;

            // Explicit guard: if no company ID is explicitly requested and it's not the owner accessing globally,
            // we should technically throw an error, but let's just use what they pass.
            const whereClause = targetCompanyId ? { company_id: targetCompanyId } : {};

            // 1. Fetch stores (Filter by CompanyID if requested)
            const stores = await prisma.store.findMany({
                where: whereClause,
                include: { meat_targets: true },
                orderBy: { store_name: 'asc' }
            });

            // 1.5 Fetch company products to get lbs_per_skewer baseline
            const products = await (prisma as any).companyProduct.findMany({
                where: whereClause
            });

            const dashboardData = [];

            // 2. Aggregate data for each store
            for (const store of stores) {
                // A. Get Manager's PrepLog for the date
                const prepLog = await (prisma as any).prepLog.findFirst({
                    where: { store_id: store.id, date: queryDate }
                });

                // B. Get Sales Forecast
                let guests = 0;
                if (prepLog) {
                    guests = prepLog.forecast;
                } else {
                    // Try to find in SalesForecast based on week_start
                    const weekStart = new Date(queryDate);
                    weekStart.setDate(queryDate.getDate() - queryDate.getDay());
                    const salesForecast = await (prisma as any).salesForecast.findFirst({
                        where: { store_id: store.id, week_start: weekStart }
                    });
                    if (salesForecast) {
                        guests = Math.round((salesForecast.forecast_dinner + salesForecast.forecast_lunch) / 7);
                    }
                }

                // C. Get Feedback if already submitted
                const feedbacks = await (prisma as any).procurementAIFeedback.findMany({
                    where: { store_id: store.id, date: queryDate }
                });

                // D. Build the protein comparison list
                const proteins = [];
                const targetLbsPerGuest = (store as any).target_lbs_guest || 1.76;

                // We will iterate through all store meat targets to build the AI Prediction
                for (const target of store.meat_targets) {
                    const productConfig = products.find((p: any) => p.name === target.protein);
                    // Default to 5 lbs per skewer if not configured
                    const lbsPerSkewer = productConfig?.lbs_per_skewer || 5.0;

                    const aiPredictedLbs = guests > 0 ? (target.target / 100) * targetLbsPerGuest * guests : 0;
                    const aiPredictedSkewers = aiPredictedLbs > 0 ? aiPredictedLbs / lbsPerSkewer : 0;

                    let managerPrepLbs = 0;
                    if (prepLog && prepLog.data && prepLog.data.prep_list) {
                        const prepItem = prepLog.data.prep_list.find((p: any) => p.name === target.protein);
                        if (prepItem) {
                            managerPrepLbs = prepItem.prep_amount || 0;
                        }
                    }

                    const managerPrepSkewers = managerPrepLbs > 0 ? managerPrepLbs / lbsPerSkewer : 0;

                    const existingFeedback = feedbacks.find((f: any) => f.protein === target.protein);

                    // Only include if either AI or Manager has > 0, to avoid clutter
                    if (aiPredictedLbs > 0 || managerPrepLbs > 0) {
                        proteins.push({
                            protein: target.protein,
                            lbs_per_skewer: lbsPerSkewer,
                            ai_predicted_lbs: parseFloat(aiPredictedLbs.toFixed(1)),
                            ai_predicted_skewers: parseFloat(aiPredictedSkewers.toFixed(1)),
                            manager_prep_lbs: parseFloat(managerPrepLbs.toFixed(1)),
                            manager_prep_skewers: parseFloat(managerPrepSkewers.toFixed(1)),
                            feedback: existingFeedback ? {
                                chosen_winner: existingFeedback.chosen_winner,
                                custom_correct_lbs: existingFeedback.custom_correct_lbs,
                                custom_correct_skewers: existingFeedback.custom_correct_skewers
                            } : null
                        });
                    }
                }

                dashboardData.push({
                    store_id: store.id,
                    store_name: store.store_name,
                    forecast_guests: guests,
                    has_manager_log: !!prepLog,
                    proteins: proteins
                });
            }

            return res.json({
                date: dateStr,
                stores: dashboardData
            });

        } catch (error) {
            console.error('Shadow Dashboard Error:', error);
            return res.status(500).json({ error: 'Failed to fetch shadow dashboard data' });
        }
    }

    // POST /api/v1/intelligence/procurement-feedback
    static async submitFeedback(req: Request, res: Response) {
        try {
            const user = (req as any).user;

            // SECURITY GATE: Only allow Alexandre
            if (!user.email?.toLowerCase().includes('alexandre@alexgarciaventures.co') && !user.email?.toLowerCase().includes('alexandre@garciaventures.co')) {
                return res.status(403).json({ error: 'Access Denied: Exclusive Feature.' });
            }

            const {
                store_id, date, protein,
                manager_prep_lbs, ai_predicted_lbs,
                manager_prep_skewers, ai_predicted_skewers,
                chosen_winner, custom_correct_lbs, custom_correct_skewers, notes
            } = req.body;

            if (!store_id || !date || !protein || !chosen_winner) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const queryDate = new Date(date + 'T00:00:00Z');

            const feedback = await (prisma as any).procurementAIFeedback.upsert({
                where: {
                    store_id_date_protein: { store_id, date: queryDate, protein }
                },
                update: {
                    manager_prep_lbs, ai_predicted_lbs,
                    manager_prep_skewers, ai_predicted_skewers,
                    chosen_winner, custom_correct_lbs, custom_correct_skewers, notes
                },
                create: {
                    store_id, date: queryDate, protein,
                    manager_prep_lbs, ai_predicted_lbs,
                    manager_prep_skewers, ai_predicted_skewers,
                    chosen_winner, custom_correct_lbs, custom_correct_skewers, notes
                }
            });

            return res.json({ success: true, feedback });

        } catch (error) {
            console.error('Procurement Feedback Error:', error);
            return res.status(500).json({ error: 'Failed to submit feedback' });
        }
    }
}
