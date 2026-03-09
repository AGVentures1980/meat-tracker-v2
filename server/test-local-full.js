const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const today = new Date();
        const dateStr = "2026-03-09";
        const queryDate = new Date(dateStr + 'T00:00:00Z');

        console.log("Fetching stores...");
        const stores = await prisma.store.findMany({
            include: { meat_targets: true },
            orderBy: { store_name: 'asc' }
        });

        console.log("Fetching products...");
        const products = await prisma.companyProduct.findMany();

        const dashboardData = [];

        console.log("Iterating stores...", stores.length);
        for (const store of stores) {
            const prepLog = await prisma.prepLog.findFirst({
                where: { store_id: store.id, date: queryDate }
            });

            let guests = 0;
            if (prepLog) {
                guests = prepLog.forecast;
            } else {
                const weekStart = new Date(queryDate);
                weekStart.setDate(queryDate.getDate() - queryDate.getDay());
                const salesForecast = await prisma.salesForecast.findFirst({
                    where: { store_id: store.id, week_start: weekStart }
                });
                if (salesForecast) {
                    guests = Math.round((salesForecast.forecast_dinner + salesForecast.forecast_lunch) / 7);
                }
            }

            const feedbacks = await prisma.procurementAIFeedback.findMany({
                where: { store_id: store.id, date: queryDate }
            });

            const proteins = [];
            let targetLbsPerGuest = store.target_lbs_guest || 1.76;

            for (const target of store.meat_targets) {
                const productConfig = products.find(p => p.name === target.protein);
                const lbsPerSkewer = productConfig?.lbs_per_skewer || 5.0;

                const aiPredictedLbs = guests > 0 ? (target.target / 100) * targetLbsPerGuest * guests : 0;
                const aiPredictedSkewers = aiPredictedLbs > 0 ? aiPredictedLbs / lbsPerSkewer : 0;

                let managerPrepLbs = 0;
                if (prepLog && prepLog.data && prepLog.data.prep_list) {
                    const prepItem = prepLog.data.prep_list.find((p) => p.name === target.protein);
                    if (prepItem) {
                        managerPrepLbs = prepItem.prep_amount || 0;
                    }
                }

                const managerPrepSkewers = managerPrepLbs > 0 ? managerPrepLbs / lbsPerSkewer : 0;
                const existingFeedback = feedbacks.find((f) => f.protein === target.protein);

                if (aiPredictedLbs > 0 || managerPrepLbs > 0) {
                    proteins.push({
                        protein: target.protein,
                        ai_predicted_lbs: parseFloat(aiPredictedLbs.toFixed(1))
                    });
                }
            }
        }
        console.log("SUCCESS!");
    } catch (e) {
        console.error("CRASH DETECTED:");
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
run();
