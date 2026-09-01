const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Running exhaustive store audit...");
    const stores = await prisma.store.findMany({
        include: {
            company: true
        }
    });

    console.log(`Found ${stores.length} stores in database.`);

    const detailedResults = [];

    for (const store of stores) {
        // Query counts for every relation
        const [
            invoices,
            orders,
            inventoryRecords,
            purchaseRecords,
            prepLogs,
            barcodeScans,
            reports,
            meatUsage,
            outlets,
            aiYieldInsights,
            auditLogs,
            barcodeDecisions,
            burgerInventoryPool,
            deliverySales,
            financialLeakageEvents,
            forecastLogs,
            inboundShipments,
            inventoryCycles,
            ocrQuarantineQueue,
            pilotAudits,
            procurementFeedback,
            productAliases,
            pullToPrepEvents,
            receivingEvents,
            salesForecasts,
            meatTargets,
            supportTickets,
            systemAlerts,
            trimRecordEvents
        ] = await Promise.all([
            prisma.invoiceRecord.count({ where: { store_id: store.id } }),
            prisma.order.count({ where: { store_id: store.id } }),
            prisma.inventoryRecord.count({ where: { store_id: store.id } }),
            prisma.purchaseRecord.count({ where: { store_id: store.id } }),
            prisma.prepLog.count({ where: { store_id: store.id } }),
            prisma.barcodeScanEvent.count({ where: { store_id: store.id } }),
            prisma.report.count({ where: { store_id: store.id } }),
            prisma.meatUsage.count({ where: { store_id: store.id } }),
            prisma.outlet.count({ where: { store_id: store.id } }),
            prisma.aiYieldInsight.count({ where: { store_id: store.id } }),
            prisma.auditLog.count({ where: { store_id: store.id } }),
            prisma.barcodeDecisionLog.count({ where: { store_id: store.id } }),
            prisma.burgerInventoryPool.count({ where: { store_id: store.id } }),
            prisma.deliverySale.count({ where: { store_id: store.id } }),
            prisma.financialLeakageEvent.count({ where: { store_id: store.id } }),
            prisma.forecastIntelligenceLog.count({ where: { store_id: store.id } }),
            prisma.inboundShipment.count({ where: { store_id: store.id } }),
            prisma.inventoryCycle.count({ where: { store_id: store.id } }),
            prisma.ocrQuarantineQueue.count({ where: { store_id: store.id } }),
            prisma.pilotDailyAudit.count({ where: { store_id: store.id } }),
            prisma.procurementAIFeedback.count({ where: { store_id: store.id } }),
            prisma.productAlias.count({ where: { store_id: store.id } }),
            prisma.pullToPrepEvent.count({ where: { store_id: store.id } }),
            prisma.receivingEvent.count({ where: { store_id: store.id } }),
            prisma.salesForecast.count({ where: { store_id: store.id } }),
            prisma.storeMeatTarget.count({ where: { store_id: store.id } }),
            prisma.supportTicket.count({ where: { store_id: store.id } }),
            prisma.systemAlert.count({ where: { store_id: store.id } }),
            prisma.trimRecordEvent.count({ where: { store_id: store.id } })
        ]);

        const totalRowSum = invoices + orders + inventoryRecords + purchaseRecords + prepLogs + barcodeScans + reports +
                            meatUsage + outlets + aiYieldInsights + auditLogs + barcodeDecisions + burgerInventoryPool +
                            deliverySales + financialLeakageEvents + forecastLogs + inboundShipments + inventoryCycles +
                            ocrQuarantineQueue + pilotAudits + procurementFeedback + productAliases + pullToPrepEvents +
                            receivingEvents + salesForecasts + meatTargets + supportTickets + systemAlerts + trimRecordEvents;

        detailedResults.push({
            id: store.id,
            name: store.store_name,
            companyName: store.company.name,
            subdomain: store.company.subdomain,
            createdAt: store.created_at,
            status: store.status,
            is_pilot: store.is_pilot,
            counts: {
                invoices,
                orders,
                inventoryRecords,
                purchaseRecords,
                prepLogs,
                barcodeScans,
                reports,
                meatUsage,
                outlets,
                aiYieldInsights,
                auditLogs,
                barcodeDecisions,
                burgerInventoryPool,
                deliverySales,
                financialLeakageEvents,
                forecastLogs,
                inboundShipments,
                inventoryCycles,
                ocrQuarantineQueue,
                pilotAudits,
                procurementFeedback,
                productAliases,
                pullToPrepEvents,
                receivingEvents,
                salesForecasts,
                meatTargets,
                supportTickets,
                systemAlerts,
                trimRecordEvents
            },
            totalRowSum
        });
    }

    console.log(JSON.stringify(detailedResults, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
