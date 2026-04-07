import { Request, Response } from 'express';

export class WeatherController {
    static async getAdvisory(req: Request, res: Response) {
        try {
            const simulateRain = req.query.simulateRain === 'true';
            
            // To guarantee the wow factor during the demo, we heavily favor rain if the query is passed.
            if (simulateRain) {
                return res.json({
                    condition: 'Severe Thunderstorms',
                    impactExpected: true,
                    suggestedReduction: 15,
                    message: "Heavy rain expected at 18:00. Historical data indicates a 15% drop in walk-in traffic over 3 hours.",
                    icon: "🌧️"
                });
            } else {
                return res.json({
                    condition: 'Clear skies',
                    impactExpected: false,
                    suggestedReduction: 0,
                    message: "Optimal forecast. Standard theoretical prep pars recommended.",
                    icon: "☀️"
                });
            }
        } catch (error) {
            console.error('Weather API Error:', error);
            res.status(500).json({ error: 'Internal server error while fetching weather data.' });
        }
    }
}
