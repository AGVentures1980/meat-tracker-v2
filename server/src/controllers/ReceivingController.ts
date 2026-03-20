import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { EmailService } from '../services/EmailService';

const prisma = new PrismaClient();

export const ReceivingController = {
    scanBarcode: async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const { barcode, weight, gtin, store_id } = req.body;
            
            let companyId = "tdb-main"; 
            let storeId = store_id || user.storeId;

            // Try to find the company scope from user
            if (user.scope && user.scope.type === 'COMPANY') {
                companyId = user.scope.companyId;
            } else {
                 if (storeId) {
                     const store = await prisma.store.findUnique({ where: { id: parseInt(storeId, 10) }});
                     if (store) companyId = store.company_id;
                 }
            }

            if (!gtin) {
                 return res.status(400).json({ error: 'No GTIN detected in barcode' });
            }

            const specs = await prisma.corporateProteinSpec.findMany({
                where: { company_id: companyId }
            });

            const spec = specs.find(s => 
                barcode.includes(s.approved_item_code) ||
                s.approved_item_code.includes(gtin) ||
                gtin && gtin.length > 5 && s.approved_item_code.includes(gtin.substring(1)) ||
                barcode === s.approved_item_code ||
                s.approved_item_code.replace(/\D/g, '') === barcode.replace(/\D/g, '')
            );

            if (spec) {
                // GTIN Mapped!
                if (storeId) {
                    await prisma.barcodeScanEvent.create({
                        data: {
                            store_id: parseInt(storeId, 10),
                            scanned_barcode: barcode,
                            is_approved: true
                        }
                    });

                    // We no longer automatically Add to Inventory here!
                    // It will go into the frontend Cart and be submitted via /submit-batch.
                }

                return res.json({ 
                    status: 'APPROVED', 
                    protein: spec.protein_name, 
                    weight 
                });
            } else {
                // Unmapped
                if (storeId) {
                    await prisma.barcodeScanEvent.create({
                        data: {
                            store_id: parseInt(storeId, 10),
                            scanned_barcode: barcode,
                            is_approved: false
                        }
                    });
                }

                // Check Role:
                if (user.role === 'admin' || user.role === 'director' || user.role === 'owner' || user.role === 'partner') {
                    // Send roster so they can map
                    const roster = await prisma.companyProduct.findMany({
                        where: { company_id: companyId },
                        select: { name: true },
                        orderBy: { name: 'asc' }
                    });
                    
                    return res.json({
                        status: 'UNMAPPED_ALLOW_MAPPING',
                        gtin,
                        roster: roster.map(r => r.name)
                    });
                }

                // If not an admin, it's a hard rejection. Send Alert.
                await EmailService.sendQCAlert({
                    storeId,
                    barcode,
                    user: user.first_name + " " + user.last_name,
                    reason: "Unauthorized GTIN scanned during Receiving"
                });

                return res.json({ status: 'REJECTED' });
            }
        } catch (error) {
            console.error('Scan Barcode Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },

    mapBarcode: async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const { gtin, protein_name, barcode, weight, store_id } = req.body;
            
            if (user.role !== 'admin' && user.role !== 'director' && user.role !== 'owner' && user.role !== 'partner') {
                return res.status(403).json({ error: 'Unauthorized to map barcodes' });
            }

            let companyId = "tdb-main"; 
            let storeId = store_id || user.storeId;
            
            if (user.scope && user.scope.type === 'COMPANY') {
                companyId = user.scope.companyId;
            } else if (storeId) {
                const store = await prisma.store.findUnique({ where: { id: parseInt(storeId, 10) }});
                if (store) companyId = store.company_id;
            }

            // Create spec
            await prisma.corporateProteinSpec.create({
                data: {
                    company_id: companyId,
                    protein_name,
                    approved_item_code: gtin,
                    approved_brand: "Scanned Manufacturer", 
                    created_by: user.first_name + " " + user.last_name
                }
            });

            // Process the scan now that it's mapped
            if (storeId) {
                 await prisma.barcodeScanEvent.create({
                        data: {
                            store_id: parseInt(storeId, 10),
                            scanned_barcode: barcode,
                            is_approved: true
                        }
                 });

                 // We no longer automatically Add to Inventory here!
                 // It will go into the frontend Cart and be submitted via /submit-batch.
            }

            res.json({ success: true, status: 'APPROVED', protein: protein_name });

        } catch (error) {
            console.error('Map Barcode Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },

    submitBatch: async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const { store_id, items } = req.body;
            
            let storeId = store_id || user.storeId;
            if (!storeId) return res.status(400).json({ error: 'Store ID required' });
            
            const storeIdNum = parseInt(storeId, 10);
            
            // Consolidate weights per protein
            const consolidated: Record<string, number> = {};
            for (const item of items) {
                if (!consolidated[item.protein]) consolidated[item.protein] = 0;
                consolidated[item.protein] += item.weight;
            }

            // Create a PurchaseRecord for each consolidated protein
            const records = [];
            for (const [protein_name, total_weight] of Object.entries(consolidated)) {
                const record = await prisma.purchaseRecord.create({
                    data: {
                        store_id: storeIdNum,
                        date: new Date(),
                        item_name: protein_name,
                        quantity: total_weight,
                        cost_total: 0 
                    }
                });
                records.push(record);
            }

            res.json({ status: 'SUCCESS', records_created: records.length });
        } catch (error) {
            console.error('Submit Batch Error:', error);
            res.status(500).json({ error: 'Internal Server Error submitting batch' });
        }
    }
};
