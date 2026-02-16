
import { MeatEngine } from './src/engine/MeatEngine';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testShiftLogic() {
    console.log("--- Starting Shift-Aware Logic Verification ---");

    // 1. Setup Mock Data (optional, or just read existing)
    // We'll try to read store 510 (Lexington) or similar
    const store = await prisma.store.findFirst();
    if (!store) {
        console.error("No store found");
        return;
    }
    console.log(`Testing with Store: ${store.store_name} (${store.id})`);

    // 2. Call Dashboard Stats
    try {
        const stats = await MeatEngine.getDashboardStats(store.id);
        console.log("Dashboard Stats Result:", {
            totalLbs: stats.totalLbsMonth,
            theoreticalRevenue: stats.theoreticalRevenue,
            foodCostInfo: stats.foodCostPercentage,
            lbsPerGuest: stats.lbsPerGuest
        });

        if (stats.theoreticalRevenue === 0) {
            console.warn("Theoretical Revenue is 0. Check if lunch/dinner guests are populated in the latest report or fallback logic.");
        }

        // 3. Call Top Meats to check Dinner Only logic
        // We verify that 'Beef Ribs' ideal usage is calculated correctly
        // We'll need access to internal TopMeats, but it's private. 
        // We can check stats.topMeats from dashboard stats
        const beefRibs = stats.topMeats.find(m => m.name.toLowerCase().includes('rib'));
        if (beefRibs) {
            console.log("Beef Ribs Data:", beefRibs);
            console.log("Ideal should be lower if Dinner Guests < Total Guests");
        } else {
            console.log("Beef Ribs not found in top meats (might not be sold recently)");
        }

    } catch (e) {
        console.error("Error in MeatEngine:", e);
    }
}

testShiftLogic()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
