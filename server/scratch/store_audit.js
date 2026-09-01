const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Starting store inventory audit...");
    const stores = await prisma.store.findMany({
        include: {
            _count: {
                select: {
                    invoices: true,
                    orders: true,
                    inventory_records: true,
                    purchase_records: true,
                    prep_logs: true,
                    BarcodeScanEvent: true,
                    reports: true
                }
            }
        }
    });

    const auditResults = [];

    for (const store of stores) {
        // Fetch a sample of invoices, purchase records, and order items to detect seed patterns
        const sampleInvoices = await prisma.invoiceRecord.findMany({
            where: { store_id: store.id },
            take: 5
        });

        const sampleOrders = await prisma.order.findMany({
            where: { store_id: store.id },
            take: 5
        });

        const sampleInventory = await prisma.inventoryRecord.findMany({
            where: { store_id: store.id },
            take: 5
        });

        // Determine if data is seeded, demo, or real operational data
        // Seeded/Demo data typically has very round numbers, placeholder items, or specific mock company IDs (like 'redbook', 'bloomin', 'fogo')
        const companyId = store.company_id.toLowerCase();
        const isDemoCompany = companyId.includes('demo') || companyId.includes('redbook') || companyId.includes('bloomin') || companyId.includes('fogo') || companyId.includes('hardrock');
        
        let hasSeededData = false;
        let hasDemoData = false;
        let hasRealOperationalData = false;

        if (store._count.invoices > 0 || store._count.orders > 0 || store._count.inventory_records > 0) {
            if (isDemoCompany) {
                hasSeededData = true;
                hasDemoData = true;
            } else {
                // If it is a real company context, check if the data has real operational patterns
                hasRealOperationalData = true;
            }
        }

        // Detect if store is named "Orlando" or similar, which might be a pilot
        const isOrlandoOrTampa = store.store_name.toLowerCase().includes('orlando') || store.store_name.toLowerCase().includes('tampa') || store.store_name.toLowerCase().includes('tampa');

        auditResults.push({
            id: store.id,
            name: store.store_name,
            location: store.location,
            created_at: store.created_at,
            company_id: store.company_id,
            status: store.status,
            is_pilot: store.is_pilot,
            invoice_count: store._count.invoices,
            order_count: store._count.orders,
            inventory_count: store._count.inventory_records,
            purchase_count: store._count.purchase_records,
            scan_count: store._count.BarcodeScanEvent,
            report_count: store._count.reports,
            hasSeededData,
            hasDemoData,
            hasRealOperationalData,
        });
    }

    console.log(JSON.stringify(auditResults, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
