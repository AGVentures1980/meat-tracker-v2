import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { EmailService } from '../services/EmailService';
import OpenAI from 'openai';
import { BarcodeDecisionEngine } from '../services/BarcodeDecisionEngine';
import { ComplianceEngine } from '../services/ComplianceEngine';
import { AlertEngine } from '../services/AlertEngine';

const prisma = new PrismaClient();

export const ReceivingController = {
    scanBarcode: async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const { barcode, weight, gtin, store_id } = req.body;
            
            let companyId = "tdb-main";
            let storeId = store_id || user.storeId;
            let verifiedStoreId: number | null = null;
            
            if (user.scope && user.scope.type === 'COMPANY') {
                companyId = user.scope.companyId;
            } else if (storeId) {
                const parsedId = parseInt(storeId as string, 10);
                if (!isNaN(parsedId)) {
                    const store = await prisma.store.findUnique({ where: { id: parsedId }});
                    if (store) companyId = store.company_id;
                    verifiedStoreId = parsedId;
                }
            }
            
            if (companyId === "tdb-main") {
                const tdb = await prisma.company.findFirst({
                    where: { name: { contains: 'Texas de Brazil', mode: 'insensitive' } }
                });
                if (tdb) companyId = tdb.id;
            }

            // 1. Fallback DEMO Patterns logic natively injected back into integration
            const DEMO_PATTERNS: Record<string, string> = { "PICANHA": "Picanha", "FRALDINHA": "Fraldinha", "LOMBO": "Pork Loin / Lombo", "CHORIZO": "Chorizo", "MIGNON": "Filet Mignon" };
            const upperBarcode = barcode ? barcode.toUpperCase() : "";
            for (const [key, protein] of Object.entries(DEMO_PATTERNS)) {
                if (upperBarcode.includes(key)) {
                    if (verifiedStoreId) await prisma.receivingEvent.create({ data: { store_id: verifiedStoreId, scanned_barcode: barcode, status: 'ACCEPTED', gtin: "DEMO" } });
                    return res.json({ status: 'APPROVED', protein, weight });
                }
            }

            const { barcodeResult } = req.body;
            let normalized: any = null;

            if (process.env.BARCODE_ENGINE_V2_ENABLED === 'true') {
                if (!barcodeResult || barcodeResult.status !== 'VALID') {
                    
                    // Sprint 5 Enhancement - Allowed Custom Mapping Flow 
                    if (barcodeResult?.status === 'UNKNOWN' && ['admin', 'director', 'owner', 'partner'].includes(user.role)) {
                        const roster = await prisma.companyProduct.findMany({ where: { company_id: companyId }, select: { name: true }});
                        return res.json({ status: 'UNMAPPED_ALLOW_MAPPING', gtin: barcodeResult.normalized_object?.raw_barcode, roster: roster.map((r: any) => r.name) });
                    }

                    return res.status(400).json({ 
                        error: 'Safe Operating Bounds Violated. Cannot accept un-normalized or un-safe generic barcodes.',
                        status: barcodeResult?.status || 'INVALID',
                        reason_code: barcodeResult?.reason_code || 'NO_PRE_FLIGHT_PARSE_FOUND'
                    });
                }
                normalized = barcodeResult.normalized_object;
            } else {
                // V1 Fallback - Legacy Mode
                normalized = await BarcodeDecisionEngine.parse(barcode, verifiedStoreId || 1);
                if (normalized.status === 'unknown') {
                    if (verifiedStoreId) await AlertEngine.trigger(verifiedStoreId, 'CRITICAL', 'BARCODE_ENGINE', 'Unknown Barcode Format Detected', { barcode });
                    return res.status(400).json({ error: 'Unknown barcode format.' });
                }
            }

            const finalGtin = normalized.gtin || gtin;
            const finalWeight = normalized.net_weight_lb || weight; // Fallback to body weight if explicitly serial/mapped

            if (!finalGtin && normalized.barcode_type !== 'PROPRIETARY' && normalized.barcode_type !== 'INTERNAL' && normalized.barcode_type !== 'SERIAL') {
                return res.status(400).json({ error: 'No GTIN detected in strictly mapped normalizer.' });
            }
            
            // 3. Compliance Engine
            const compliance = await ComplianceEngine.evaluate(normalized, companyId);

            if (verifiedStoreId) {
                await prisma.receivingEvent.create({
                    data: {
                        store_id: verifiedStoreId,
                        scanned_barcode: barcode,
                        gtin: finalGtin,
                        product_code: normalized.product_code,
                        weight: finalWeight,
                        supplier: compliance.specMatched?.supplier || "Unknown",
                        status: compliance.status,
                        alert_severity: compliance.status === 'REJECTED' ? 'CRITICAL' : (compliance.status === 'ACCEPTED_WITH_WARNING' ? 'WARNING' : 'INFO')
                    }
                });

                if (compliance.status === 'REJECTED') {
                    await AlertEngine.trigger(verifiedStoreId, 'CRITICAL', 'COMPLIANCE', 'Receiving Scanner Rejection', { barcode, details: compliance.details });
                } else if (compliance.status === 'ACCEPTED_WITH_WARNING') {
                    await AlertEngine.trigger(verifiedStoreId, 'WARNING', 'COMPLIANCE', 'Receiving Tracker Exception', { barcode, details: compliance.details });
                }
            }

            if (compliance.status === 'REJECTED') {
                 if (user.role === 'admin' || user.role === 'director' || user.role === 'owner' || user.role === 'partner') {
                    const roster = await prisma.companyProduct.findMany({ where: { company_id: companyId }, select: { name: true }});
                    return res.json({ status: 'UNMAPPED_ALLOW_MAPPING', gtin: finalGtin, roster: roster.map(r => r.name) });
                }
                return res.json({ status: 'REJECTED', details: compliance.details });
            }
            
            return res.json({ 
                status: compliance.status === 'ACCEPTED' ? 'APPROVED' : compliance.status, 
                protein: compliance.specMatched?.protein_name || normalized.product_name, 
                weight: finalWeight,
                details: compliance.details 
            });

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
                const store = await prisma.store.findUnique({ where: { id: parseInt(storeId as string, 10) }});
                if (store) companyId = store.company_id;
            }

            if (companyId === "tdb-main") {
                const tdbCompanies = await prisma.company.findMany({
                    where: { name: { contains: 'Texas', mode: 'insensitive' } }
                });
                
                if (tdbCompanies.length > 0) {
                    // Split-brain defense: Create a spec in ALL matching Texas companies just to be absolutely sure.
                    for (const comp of tdbCompanies) {
                        try {
                            await prisma.corporateProteinSpec.create({
                                data: {
                                    company_id: comp.id,
                                    protein_name,
                                    approved_item_code: barcode || gtin,
                                    approved_brand: "Scanned Manufacturer",
                                    created_by: user.first_name + " " + user.last_name
                                }
                            });
                        } catch (e) {
                            // ignore duplicates if they exist
                        }
                    }
                }
            } else {
                // Not split-brain admin, normal flow
                await prisma.corporateProteinSpec.create({
                    data: {
                        company_id: companyId,
                        protein_name,
                        approved_item_code: barcode || gtin,
                        approved_brand: "Scanned Manufacturer", 
                        created_by: user.first_name + " " + user.last_name
                    }
                });
            }

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
