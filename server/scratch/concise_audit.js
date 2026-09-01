const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const stores = await prisma.store.findMany({
        include: { company: true },
        orderBy: { id: 'asc' }
    });

    console.log("ID   | Store Name             | Company                   | Subdomain | Created At | Status   | Pilot | Invoices | Orders | Inventory | Purchases | Outlets | Total Rows");
    console.log("-".repeat(150));

    for (const store of stores) {
        const [inv, ord, ivr, pur, otl] = await Promise.all([
            prisma.invoiceRecord.count({ where: { store_id: store.id } }),
            prisma.order.count({ where: { store_id: store.id } }),
            prisma.inventoryRecord.count({ where: { store_id: store.id } }),
            prisma.purchaseRecord.count({ where: { store_id: store.id } }),
            prisma.outlet.count({ where: { store_id: store.id } })
        ]);
        const total = inv + ord + ivr + pur + otl;
        console.log(
            `${store.id.toString().padEnd(4)} | ` +
            `${store.store_name.padEnd(22)} | ` +
            `${store.company.name.padEnd(25)} | ` +
            `${store.company.subdomain.padEnd(9)} | ` +
            `${store.created_at.toISOString().split('T')[0]} | ` +
            `${store.status.padEnd(8)} | ` +
            `${store.is_pilot.toString().padEnd(5)} | ` +
            `${inv.toString().padEnd(8)} | ` +
            `${ord.toString().padEnd(6)} | ` +
            `${ivr.toString().padEnd(9)} | ` +
            `${pur.toString().padEnd(9)} | ` +
            `${otl.toString().padEnd(7)} | ` +
            `${total}`
        );
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
