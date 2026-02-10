
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { MEAT_UNIT_WEIGHTS } from '../config/meat_weights';
import { MEAT_STANDARDS } from '../config/standards'; // Fallback

const prisma = new PrismaClient();

export class SmartPrepController {

    static async getDailyPrep(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const { date, guests } = req.query; // guests can be an override

            const storeId = user.storeId;
            if (!storeId) {
                return res.status(400).json({ error: 'User not assigned to a store' });
            }

            // 1. Get Store Settings (Target Lbs)
            const store = await prisma.store.findUnique({
                where: { id: storeId },
                include: { meat_targets: true }
            });

            if (!store) return res.status(404).json({ error: 'Store not found' });

            const targetLbsPerGuest = store.target_lbs_guest || 1.76;

            // 2. Determine Forecasted Guests
            // Priority: Manual Override (Query) > 4-Week Average for this Day of Week > Default
            let forecast = 150; // Default fallback

            if (guests) {
                forecast = parseInt(guests as string);
            } else {
                // Simple logical forecast: Look at last 4 same-days (e.g. last 4 Fridays)
                // For MVP, we'll just mock a fluctuation or use a static "Last Week" value if available.
                // Let's fetch the last report to get a sense of scale.
                const lastReport = await prisma.report.findFirst({
                    where: { store_id: storeId },
                    orderBy: { generated_at: 'desc' }
                });

                if (lastReport) {
                    // Rough daily est from monthly / 30
                    forecast = Math.round(lastReport.total_lbs / targetLbsPerGuest / 30);
                }
            }

            // 3. Calculate Prep
            // Total Meat Needed = Forecast * Target
            const totalMeatLbs = forecast * targetLbsPerGuest;

            // Get Distribution (Mix)
            // Use Store Specific targets if they exist, otherwise Global Standard
            const prepList = [];

            // We iterate through known proteins
            const proteins = Object.keys(MEAT_UNIT_WEIGHTS);

            for (const protein of proteins) {
                // Find mix %
                let mixPercentage = 0;

                // Check if store has specific target for this protein
                const specificOverride = store.meat_targets.find(t => t.protein === protein);

                if (specificOverride) {
                    // specificOverride.target is in LBS per Guest.
                    // So Mix % = specific / total_target
                    mixPercentage = specificOverride.target / targetLbsPerGuest;
                } else {
                    // Fallback to standard
                    const stdVal = MEAT_STANDARDS[protein] || 0;
                    // Standard values are "Lbs per Guest" (e.g. 0.39 for Picanha)
                    // We normalize against the 1.76 baseline to get %, then apply to current store target
                    // Actually, simpler: The std value IS the Lbs/Guest for a 1.76 store.
                    // If this store is 1.76, we use 0.39.
                    // If this store is 1.23, we should scale it? 
                    // Let's assume the Standard is "Consumption Ratio". 
                    // Let's calculate the "Standard Ratio" = 0.39 / 1.76.
                    mixPercentage = stdVal / 1.76;
                }

                const neededLbs = totalMeatLbs * mixPercentage;
                const unitWeight = MEAT_UNIT_WEIGHTS[protein] || 1;
                const neededUnits = neededLbs / unitWeight;

                prepList.push({
                    protein,
                    unit_name: 'Piece/Whole', // Simplification
                    avg_weight: unitWeight,
                    mix_percentage: (mixPercentage * 100).toFixed(1) + '%',
                    recommended_lbs: parseFloat(neededLbs.toFixed(2)),
                    recommended_units: Math.round(neededUnits * 10) / 10 // 1 decimal place
                });
            }

            // Sort by Lbs (Volume) desc
            prepList.sort((a, b) => b.recommended_lbs - a.recommended_lbs);

            return res.json({
                store_name: store.store_name,
                date: date || new Date().toISOString().split('T')[0],
                forecast_guests: forecast,
                target_lbs_guest: targetLbsPerGuest,
                prep_list: prepList
            });

        } catch (error) {
            console.error('Smart Prep Error:', error);
            return res.status(500).json({ error: 'Failed to generate prep list' });
        }
    }
}
