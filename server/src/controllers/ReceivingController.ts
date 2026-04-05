import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { EmailService } from '../services/EmailService';
import OpenAI from 'openai';

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
                     const parsedId = parseInt(storeId, 10);
                     if (!isNaN(parsedId)) {
                         const store = await prisma.store.findUnique({ where: { id: parsedId }});
                         if (store) companyId = store.company_id;
                     }
                 }
            }

            if (!gtin) {
                 return res.status(400).json({ error: 'No GTIN detected in barcode' });
            }

            const specs = await prisma.corporateProteinSpec.findMany({
                where: { company_id: companyId }
            });

            const spec = specs.find(s => {
                let cleanAppCode = s.approved_item_code.replace(/\D/g, '');
                const cleanGtin = gtin ? gtin.replace(/\D/g, '') : '';
                
                // If David accidentally registered the GTIN including the Application Identifier like "0190627577091328"
                if (cleanAppCode.length === 16 && (cleanAppCode.startsWith('01') || cleanAppCode.startsWith('02'))) {
                    cleanAppCode = cleanAppCode.substring(2);
                }

                // STRICT MATCH ONLY!
                // Do not use `.includes()` randomly because different cuts share the same manufacturer prefix!
                if (cleanGtin && cleanAppCode) {
                    if (cleanGtin === cleanAppCode) return true;
                    if (cleanGtin.padStart(14, '0') === cleanAppCode.padStart(14, '0')) return true;
                    
                    // Provide a slight leeway if the actual exact GTIN is embedded safely at the end
                    if (cleanAppCode.length >= 13 && cleanGtin.endsWith(cleanAppCode)) return true;
                    if (cleanGtin.length >= 13 && cleanAppCode.endsWith(cleanGtin)) return true;

                    // THE SKU RESOLVER: 
                    // Supply Chain often registers the 5-digit vendor SKU (e.g., '88851') instead of the 14-digit GTIN.
                    // In a standard 14-digit GS1 GTIN, the short SKU appears exactly before the final Check Digit!
                    // If we slice off the final check digit, does the string end with David's registered code?
                    if (cleanGtin.length >= 13 && cleanAppCode.length >= 4) {
                        const gtinWithoutCheckDigit = cleanGtin.slice(0, -1);
                        if (gtinWithoutCheckDigit.endsWith(cleanAppCode)) {
                            return true;
                        }
                    }
                }

                return barcode === s.approved_item_code;
            });

            let verifiedStoreId: number | null = null;
            if (storeId) {
                const parsedId = parseInt(storeId as string, 10);
                if (!isNaN(parsedId)) {
                    const storeExists = await prisma.store.findUnique({ where: { id: parsedId }});
                    if (storeExists) {
                        verifiedStoreId = parsedId;
                    }
                }
            }

            if (spec) {
                // GTIN Mapped!
                if (verifiedStoreId) {
                    try {
                        await prisma.barcodeScanEvent.create({
                            data: {
                                store_id: verifiedStoreId,
                                scanned_barcode: barcode,
                                gtin: gtin,
                                is_approved: true
                            }
                        });
                    } catch (e) {
                        console.error('Failed to log approved scan:', e);
                    }
                }

                return res.json({ 
                    status: 'APPROVED', 
                    protein: spec.protein_name, 
                    weight 
                });
            } else {
                // GTIN is Unmapped! The Garcia Rule forbids auto-approval via AI.
                // We proceed directly to Manual Fallback / Rejection.

                // AI Failed or Unrecognized - Proceed to Manual Fallback
                if (verifiedStoreId) {
                    try {
                        await prisma.barcodeScanEvent.create({
                            data: {
                                store_id: verifiedStoreId,
                                scanned_barcode: barcode,
                                gtin: gtin,
                                is_approved: false
                            }
                        });
                    } catch (e) {
                        console.error('Failed to log rejected scan:', e);
                    }
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
        } catch (error: any) {
            console.error('Scan Barcode Error:', error);
            res.status(500).json({ error: error.message ? `CRASH TRACE: ${error.message.substring(0, 150)}` : 'Internal Server Error' });
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
    },

    purgeAI: async (req: any, res: any) => {
        try {
            await prisma.corporateProteinSpec.deleteMany({
                where: {
                    approved_brand: "AI Auto-Mapped Manufacturer"
                }
            });
            return res.json({ success: true, message: "Todas as sujeiras da IA foram limpas do Banco Oficial!" });
        } catch (err) {
            return res.status(500).json({ error: "Failed to purge AI data" });
        }
    },

    rawSpecs: async (req: any, res: any) => {
        try {
            const specs = await prisma.corporateProteinSpec.findMany();
            return res.json(specs);
        } catch (err) {
            return res.status(500).json({ error: "Failed to fetch raw specs" });
        }
    }
};
