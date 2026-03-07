import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Injecting 10 lbs of Beef Ribs (anomaly)...");

    const store = await prisma.store.findFirst();
    if (!store) {
        console.error("No store found.");
        return;
    }

    let product = await prisma.companyProduct.findFirst({ where: { name: "Beef Ribs" } });

    if (!product) {
        product = await prisma.companyProduct.create({
            data: { name: "Beef Ribs", company_id: store.company_id, category: "Protein" }
        });
    }

    const order = await prisma.order.create({
        data: {
            store_id: store.id,
            source: "OLO",
            order_date: new Date(),
            items: {
                create: [{ item_name: "Beef Ribs", protein_type: "Beef Ribs", lbs: 10 }]
            }
        }
    });

    console.log("Order created. ID:", order.id);
}

main().finally(() => prisma.$disconnect());
