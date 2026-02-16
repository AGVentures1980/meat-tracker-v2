
import { MeatEngine } from './src/engine/MeatEngine';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCompanyStats() {
    console.log("--- Starting Company Dashboard Stats Verification ---");

    // Mock User (Director Level)
    const user = { role: 'director' };

    try {
        const stats = await MeatEngine.getCompanyDashboardStats(user);

        console.log(`Retrieved stats for ${stats.performance.length} stores.`);

        if (stats.performance.length > 0) {
            const firstStore = stats.performance[0];
            console.log("Sample Store Data:", {
                name: firstStore.name,
                guests: firstStore.guests,
                theoreticalRevenue: firstStore.theoreticalRevenue,
                foodCostPercentage: firstStore.foodCostPercentage,
                costPerGuest: firstStore.costPerGuest,
                impact: firstStore.impactYTD
            });

            if (firstStore.theoreticalRevenue !== undefined && firstStore.foodCostPercentage !== undefined) {
                console.log("✅ New Metrics (Theoretical Revenue & Food Cost %) are present.");
            } else {
                console.error("❌ Missing New Metrics in response.");
            }
        }

    } catch (e) {
        console.error("Error fetching company stats:", e);
    }
}

testCompanyStats()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
