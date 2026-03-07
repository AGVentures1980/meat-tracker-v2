const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Seeding fake 'Fat Finger' order for Beef Ribs...");
    
    // Get a store for the test
    const store = await prisma.store.findFirst();
    if (!store) {
        console.error("No store found to test with.");
        return;
    }

    // Ensure Beef Ribs product exists
    let ribs = await prisma.product.findFirst({ where: { name: "Beef Ribs" } });
    if (!ribs) {
        ribs = await prisma.product.create({
            data: {
                name: "Beef Ribs",
                category: "Protein",
                unit: "lbs",
                cost_per_unit: 5.50,
                yield_percent: 0.6
            }
        });
    }

    // Create a fake OLO delivery with a tiny amount of Beef Ribs (e.g. they typed '10' meaning 10 ribs = 50 lbs, but it registered as 10 lbs)
    const testOrder = await prisma.order.create({
        data: {
            store_id: store.id,
            total_cost: 55.00,
            status: "Delivered",
            items: {
                create: [
                    {
                        product_id: ribs.id,
                        protein_type: "Beef Ribs",
                        lbs: 10, // The anomaly value!
                        cost_per_lb: 5.50,
                        total_cost: 55.00
                    }
                ]
            }
        }
    });

    console.log(`Created fake order ID ${testOrder.id} with 10 lbs of Beef Ribs.`);
    console.log("\nRunning Sentinel Audit...");
    
    // Dynamically require and run the agent to see the output
    const { PilotSentinelAgent } = require('./build/agents/PilotSentinelAgent');
    await PilotSentinelAgent.runAudit();

    console.log("\nChecking Vault Messages...");
    const messages = await prisma.ownerVaultMessage.findMany({
        orderBy: { created_at: 'desc' },
        take: 3
    });

    console.log(messages.map(m => m.text));
}

main().finally(() => prisma.$disconnect());
