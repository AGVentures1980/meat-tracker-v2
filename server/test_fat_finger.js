const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Injecting 10 lbs of Beef Ribs (anomaly)...");
    
    const store = await prisma.store.findFirst();
    let product = await prisma.product.findFirst({ where: { name: "Beef Ribs" } });

    if (!product) { // Seed if missing
        product = await prisma.product.create({
            data: { name: "Beef Ribs", category: "Protein", unit: "lbs", cost_per_unit: 5.50, yield_percent: 0.6 }
        });
    }

    const order = await prisma.order.create({
        data: {
            store_id: store.id,
            total_cost: 55,
            status: "Delivered",
            items: {
                create: [{ protein_type: "Beef Ribs", product_id: product.id, lbs: 10, cost_per_lb: 5.5, total_cost: 55 }]
            }
        }
    });

    console.log("Order created. ID:", order.id);
}

main().finally(() => prisma.$disconnect());
