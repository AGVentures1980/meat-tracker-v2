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

            const spec = specs.find(s => {
                const cleanAppCode = s.approved_item_code.replace(/\D/g, '');
                const cleanGtin = gtin ? gtin.replace(/\D/g, '') : '';
                
                if (cleanGtin && cleanAppCode) {
                    // 1. Exact Intersection Match
                    if (cleanAppCode.includes(cleanGtin) || cleanGtin.includes(cleanAppCode)) return true;
                }

                // 2. Fallback to basic string inclusion
                return (
                    barcode.includes(s.approved_item_code) ||
                    (gtin && s.approved_item_code.includes(gtin)) ||
                    barcode === s.approved_item_code ||
                    cleanAppCode === barcode.replace(/\D/g, '')
                );
            });

            if (spec) {
                // GTIN Mapped!
                if (storeId) {
                    await prisma.barcodeScanEvent.create({
                        data: {
                            store_id: parseInt(storeId, 10),
                            scanned_barcode: barcode,
                            gtin: gtin,
                            is_approved: true
                        }
                    });
                }

                return res.json({ 
                    status: 'APPROVED', 
                    protein: spec.protein_name, 
                    weight 
                });
            } else {
                // Unmapped -- Try AI Auto-Map!
                const roster = await prisma.companyProduct.findMany({
                    where: { company_id: companyId },
                    select: { name: true },
                    orderBy: { name: 'asc' }
                });

                try {
                    const openai = new OpenAI();
                    const prompt = `You are an expert meat industry supply chain AI. 
A user has scanned a raw GS1-128 barcode string: ${barcode} (Parsed GTIN: ${gtin}). 

Your task is to identify the Manufacturer/Packer and the common Generic Protein Name associated with this GTIN or its Company Prefix.

INTELLIGENCE DIRECTIVES:
If the GTIN contains '90627577091328' or its prefix is '0627577', the Protein MUST be "Sirloin / Picanha" and the Brand MUST be "Clear River Farms (JBS Canada)".
If the GTIN contains '0076338' or '0079338', brand is "JBS USA / Friboi" and Protein is "Picanha" or "Fraldinha".

Available exact roster of strictly permitted protein names: 
${roster.map(r => r.name).join(', ')}

You MUST select the closest exact string from the Available roster above. If you identify it is Picanha, match it to the roster element for Picanha. If it's ribs, match it to ribs.

Respond ONLY with a JSON object:
{"success": true, "protein_name_from_roster": "exact string from roster"}
If absolutely unknown, set "protein_name_from_roster": null`;

                    const completion = await openai.chat.completions.create({
                        messages: [{ role: 'user', content: prompt }],
                        model: 'gpt-4o',
                        temperature: 0.1,
                        response_format: { type: "json_object" }
                    });

                    const resultText = completion.choices[0].message.content;
                    if (resultText) {
                        const result = JSON.parse(resultText);
                        if (result.success && result.protein_name_from_roster) {
                            // AI Confident -> Auto-Map it!
                            await prisma.corporateProteinSpec.create({
                                data: {
                                    company_id: companyId,
                                    protein_name: result.protein_name_from_roster,
                                    approved_item_code: gtin || barcode,
                                    approved_brand: "AI Auto-Mapped Manufacturer",
                                    created_by: user.first_name + " " + user.last_name
                                }
                            });

                            if (storeId) {
                                await prisma.barcodeScanEvent.create({
                                    data: {
                                        store_id: parseInt(storeId, 10),
                                        scanned_barcode: barcode,
                                        gtin: gtin,
                                        is_approved: true
                                    }
                                });
                            }

                            return res.json({ 
                                status: 'APPROVED', 
                                protein: result.protein_name_from_roster, 
                                weight 
                            });
                        }
                    }
                } catch (aiError) {
                    console.error("AI Auto-Map failed", aiError);
                }

                // AI Failed or Unrecognized - Proceed to Manual Fallback
                if (storeId) {
                    await prisma.barcodeScanEvent.create({
                        data: {
                            store_id: parseInt(storeId, 10),
                            scanned_barcode: barcode,
                            gtin: gtin,
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
