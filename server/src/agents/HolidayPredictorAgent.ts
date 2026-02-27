import OpenAI from 'openai';

interface PredictionContext {
    country: string;
    city: string | null;
    targetDate: string; // YYYY-MM-DD
    historicalLunchAvg: number;
    historicalDinnerAvg: number;
}

interface HolidayPrediction {
    suggested_lunch_guests: number;
    suggested_dinner_guests: number;
    holiday_insight: string | null;
}

const openai = new OpenAI(); // Automatically uses process.env.OPENAI_API_KEY

export class HolidayPredictorAgent {
    static async getHolidayForecast(context: PredictionContext): Promise<HolidayPrediction | null> {
        try {
            console.log(`[HolidayPredictorAgent] Analyzing ${context.targetDate} for ${context.city || 'Unknown'}, ${context.country}`);

            // In a real production system we might use a dedicated API for holidays, but here we use the LLM's world knowledge as a function.
            const prompt = `You are an expert Restaurant Demand Forecaster.
You need to predict guest traffic for a restaurant located in ${context.city ? context.city + ', ' : ''}${context.country}.
The target date is ${context.targetDate}.
Baseline historical traffic for this day of the week:
- Lunch: ${context.historicalLunchAvg}
- Dinner: ${context.historicalDinnerAvg}

Your task:
1. Identify if ${context.targetDate} falls on or within ~7 days (1 week) of a major holiday or cultural event in ${context.country}. 
   - Note: Holidays vary by country! (e.g., Valentine's Day in Brazil is June 12, not Feb 14. Mother's Day dates vary).
2. If there is a major event, estimate the impact on restaurant traffic (e.g. +40% for Mother's Day lunch, +20% for Valentine's dinner).
3. If there is NO significant event, return the baseline numbers and set holiday_insight to null.

Return a JSON object strictly matching this schema:
{
  "suggested_lunch_guests": number,
  "suggested_dinner_guests": number,
  "holiday_insight": string | null
}
For the insight, be concise, e.g., "Mother's Day (BR) is this Sunday. Suggesting +40% lift based on holiday traffic."`;

            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini", // Using mini for speed/cost in day-to-day operations
                messages: [
                    { role: "system", content: "You are a specialized AI agent outputting strictly valid JSON." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" },
                temperature: 0.1,
            });

            const content = response.choices[0].message.content;
            if (!content) return null;

            const prediction = JSON.parse(content) as HolidayPrediction;

            // Fallback safety to ensure valid numbers
            if (typeof prediction.suggested_lunch_guests !== 'number') prediction.suggested_lunch_guests = context.historicalLunchAvg;
            if (typeof prediction.suggested_dinner_guests !== 'number') prediction.suggested_dinner_guests = context.historicalDinnerAvg;

            return prediction;

        } catch (error) {
            console.error('[HolidayPredictorAgent] Error:', error);
            return null; // Fail gracefully so the app continues with baseline
        }
    }
}
