const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
    console.log("Confirming Store count and exporting...");
    const stores = await prisma.store.findMany();
    console.log(`Current Store table count: ${stores.length}`);

    // Export Store table to backup file
    const backupPath = path.join(__dirname, 'store_table_pre_data_type_backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(stores, null, 2));
    console.log(`Exported Store table to: ${backupPath}`);

    // Confirm counts for transactional tables
    const counts = {
        InvoiceRecord: await prisma.invoiceRecord.count(),
        Order: await prisma.order.count(),
        InventoryRecord: await prisma.inventoryRecord.count(),
        PurchaseRecord: await prisma.purchaseRecord.count(),
        MeatUsage: await prisma.meatUsage.count(),
        ReceivingEvent: await prisma.receivingEvent.count(),
        AuditLog: await prisma.auditLog.count(),
        SystemAlert: await prisma.systemAlert.count()
    };

    const countsPath = path.join(__dirname, 'pre_migration_counts.json');
    fs.writeFileSync(countsPath, JSON.stringify(counts, null, 2));
    console.log(`Pre-migration counts written to: ${countsPath}`);
    console.log("Transactional counts:", counts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
