import { PrismaClient } from '@prisma/client';
import { HolidayPredictorAgent } from './src/agents/HolidayPredictorAgent';

async function testHolidays() {
    console.log("Testing AI Holiday Predictor for Valentine's Day in USA...");
    const predictionUS = await HolidayPredictorAgent.getHolidayForecast({
        country: 'USA',
        city: 'Miami',
        targetDate: '2026-02-14',
        historicalLunchAvg: 80,
        historicalDinnerAvg: 180
    });
    console.log("USA Result:", JSON.stringify(predictionUS, null, 2));

    console.log("\nTesting AI Holiday Predictor for Valentine's Day in Brazil (June 12)...");
    const predictionBR = await HolidayPredictorAgent.getHolidayForecast({
        country: 'Brazil',
        city: 'Sao Paulo',
        targetDate: '2026-06-12',
        historicalLunchAvg: 100,
        historicalDinnerAvg: 220
    });
    console.log("Brazil Result:", JSON.stringify(predictionBR, null, 2));
}

testHolidays().catch(console.error);
