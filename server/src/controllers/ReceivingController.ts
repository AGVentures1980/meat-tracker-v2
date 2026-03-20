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

            const spec = await prisma.corporateProteinSpec.findFirst({
                where: { 
                    company_id: companyId,
                    approved_item_code: gtin 
                }
            });

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

                    // Add to Inventory! Create a purchase record
                    if (weight) {
                        await prisma.purchaseRecord.create({
                            data: {
                                store_id: parseInt(storeId, 10),
                                date: new Date(),
                                item_name: spec.protein_name,
                                quantity: weight,
                                cost_total: 0 
                            }
                        });
                    }
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

                 if (weight) {
                     await prisma.purchaseRecord.create({
                            data: {
                                store_id: parseInt(storeId, 10),
                                date: new Date(),
                                item_name: protein_name,
                                quantity: weight,
                                cost_total: 0 
                            }
                     });
                 }
            }

            res.json({ success: true, status: 'APPROVED', protein: protein_name });

        } catch (error) {
            console.error('Map Barcode Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};
