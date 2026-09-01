const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Checking global counts...");
    const counts = {
        stores: await prisma.store.count(),
        companies: await prisma.company.count(),
        invoices: await prisma.invoiceRecord.count(),
        orders: await prisma.order.count(),
        inventories: await prisma.inventoryRecord.count(),
        purchases: await prisma.purchaseRecord.count(),
        meatUsage: await prisma.meatUsage.count(),
        receivingEvents: await prisma.receivingEvent.count(),
        auditLogs: await prisma.auditLog.count(),
        systemAlerts: await prisma.systemAlert.count()
    };
    console.log("Counts:", JSON.stringify(counts, null, 2));

    console.log("Env status:");
    console.log("DATABASE_URL present?", !!process.env.DATABASE_URL);
    console.log("REDIS_URL present?", !!process.env.REDIS_URL);
    console.log("NODE_ENV:", process.env.NODE_ENV || "undefined");
}

main().catch(console.error).finally(() => prisma.$disconnect());
