const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testOlo() {
    // 1. Give store default targets
    await prisma.store.update({
        where: { id: 1 },
        data: { target_lbs_guest: 1.76, olo_target_lbs_order: 0.50 }
    });

    // 2. Set OLO Forecast (Using Prisma directly to skip auth token needs)
    const weekStart = new Date('2026-04-13T00:00:00Z');
    await prisma.salesForecast.upsert({
        where: { store_id_week_start: { store_id: 1, week_start: weekStart } },
        update: { forecast_lunch: 700, forecast_dinner: 1400, forecast_olo: 140 },
        create: { store_id: 1, week_start: weekStart, forecast_lunch: 700, forecast_dinner: 1400, forecast_olo: 140 }
    });
    
    // We expect dineIn daily: (700+1400)/7 = 300
    // We expect olo daily: 140/7 = 20

    console.log("Mock setup complete.");
}
testOlo().catch(console.error);
