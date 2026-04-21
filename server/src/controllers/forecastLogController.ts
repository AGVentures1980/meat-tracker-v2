import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { FeatureFlags } from '../utils/featureFlags';

const prisma = new PrismaClient();

export const upsertForecastLog = async (req: Request, res: Response) => {
    try {
        if (!FeatureFlags.FF_FORECAST_INTELLIGENCE) {
            return res.status(403).json({ success: false, message: 'Feature flag FF_FORECAST_INTELLIGENCE is disabled' });
        }

        const { store_id, business_date, reservation_forecast, manager_adjusted_forecast, actual_dine_in_guests } = req.body;
        const company_id = (req as any).user?.company_id || 'UNKNOWN';

        if (!store_id || !business_date) {
            return res.status(400).json({ success: false, message: 'Missing store_id or business_date' });
        }

        const result = await prisma.forecastIntelligenceLog.upsert({
            where: {
                store_id_business_date: {
                    store_id: Number(store_id),
                    business_date: new Date(business_date)
                }
            },
            update: {
                ...(reservation_forecast !== undefined && { reservation_forecast: Number(reservation_forecast) }),
                ...(manager_adjusted_forecast !== undefined && { manager_adjusted_forecast: Number(manager_adjusted_forecast) }),
                ...(actual_dine_in_guests !== undefined && { actual_dine_in_guests: Number(actual_dine_in_guests) })
            },
            create: {
                company_id,
                store_id: Number(store_id),
                business_date: new Date(business_date),
                reservation_forecast: reservation_forecast !== undefined ? Number(reservation_forecast) : null,
                manager_adjusted_forecast: manager_adjusted_forecast !== undefined ? Number(manager_adjusted_forecast) : null,
                actual_dine_in_guests: actual_dine_in_guests !== undefined ? Number(actual_dine_in_guests) : null,
            }
        });

        res.json({ success: true, log: result });
    } catch (error: any) {
        console.error('ForecastLog Upsert Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
