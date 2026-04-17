import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class InboundService {
    static async getAvailableShipments(storeId: number, supplierId?: string) {
        const whereClause: any = {
            store_id: storeId,
            status: { in: ['IMPORTED', 'PARTIALLY_RECEIVED'] }
        };

        if (supplierId) {
            whereClause.supplier_id = String(supplierId);
        }

        return await prisma.inboundShipment.findMany({
            where: whereClause,
            include: {
                _count: { select: { units: true } },
                units: { where: { status: 'AVAILABLE' } }
            },
            orderBy: { created_at: 'desc' }
        });
    }

    static async expandInvoiceIntoVariableUnits(params: {
        companyId: string;
        storeId: number;
        invoiceNumber: string;
        supplierId?: string;
        items: any[];
    }) {
        const { companyId, storeId, invoiceNumber, supplierId, items } = params;

        // Duplicate Avoidance
        const existing = await prisma.inboundShipment.findFirst({
            where: { store_id: storeId, invoice_number: invoiceNumber }
        });

        if (existing) {
            return { shipment: existing, message: 'Shipment already imported', duplicate: true };
        }

        // Begin Transaction to guarantee integral shipment import
        const newShipment = await prisma.$transaction(async (tx) => {
            const shipment = await tx.inboundShipment.create({
                data: {
                    company_id: companyId,
                    store_id: storeId,
                    invoice_number: invoiceNumber,
                    supplier_id: supplierId || null,
                    total_boxes: 0,
                }
            });

            let totalBoxesCounter = 0;

            for (const item of items) {
                const caseQuantity = Number(item.caseQuantity || 1);
                const totalWeightLb = Number(item.totalWeightLb || 0);

                const unitExpectedWeight = caseQuantity > 0 && totalWeightLb > 0 
                    ? totalWeightLb / caseQuantity 
                    : totalWeightLb;

                const weightType = caseQuantity > 1 ? 'VARIABLE' : 'FIXED';

                const lineUnitsToCreate = [];
                for (let i = 0; i < caseQuantity; i++) {
                    lineUnitsToCreate.push({
                        shipment_id: shipment.id,
                        item_name: item.itemName || 'Unknown Item',
                        expectedWeightLb: unitExpectedWeight,
                        weightType: weightType,
                        status: 'AVAILABLE'
                    });
                    totalBoxesCounter++;
                }

                if (lineUnitsToCreate.length > 0) {
                    await tx.inboundLineUnit.createMany({
                        data: lineUnitsToCreate
                    });
                }
            }

            const updatedShipment = await tx.inboundShipment.update({
                where: { id: shipment.id },
                data: { total_boxes: totalBoxesCounter }
            });

            await tx.auditEvent.create({
                data: {
                    action: 'INBOUND_INVOICE_PROCESSED',
                    actor: 'SYSTEM',
                    store_id: storeId,
                    target_id: updatedShipment.id,
                    payload: { invoiceNumber, supplierId, generatedUnits: totalBoxesCounter }
                }
            });

            return updatedShipment;
        });

        return { shipment: newShipment, duplicate: false };
    }
}
