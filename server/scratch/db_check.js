const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Global table counts:");
    const stores = await prisma.store.count();
    const companies = await prisma.company.count();
    const invoices = await prisma.invoiceRecord.count();
    const orders = await prisma.order.count();
    const orderItems = await prisma.orderItem.count();
    const inventories = await prisma.inventoryRecord.count();
    const purchases = await prisma.purchaseRecord.count();
    const reports = await prisma.report.count();
    const scans = await prisma.barcodeScanEvent.count();

    console.log({
        stores,
        companies,
        invoices,
        orders,
        orderItems,
        inventories,
        purchases,
        reports,
        scans
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
