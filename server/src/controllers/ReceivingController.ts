import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { EmailService } from '../services/EmailService';
import OpenAI from 'openai';
import { BarcodeDecisionEngine } from '../services/BarcodeDecisionEngine';
import { ComplianceEngine } from '../services/ComplianceEngine';
import { AlertEngine } from '../services/AlertEngine';
import { getUserId, requireTenant, AuthContextMissingError } from '../utils/authContext';


const prisma = new PrismaClient();

export const ReceivingController = {
    scanBarcode: async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const { barcode, weight, gtin, store_id } = req.body;
            
            let companyId = requireTenant((req as any).user);
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
                const scanEvent = await prisma.barcodeScanEvent.create({
                    data: {
                        store_id: verifiedStoreId,
                        scanned_barcode: barcode,
                        gtin: finalGtin,
                        usda_grade: normalized.usda_grade,
                        is_approved: compliance.status === 'ACCEPTED',
                        is_override: false,
                        protein_name: compliance.specMatched?.protein_name || normalized.product_name || "Unknown Reject",
                        supplier: compliance.specMatched?.supplier || normalized.packer || "Unknown",
                        weight: finalWeight,
                        metadata: normalized
                    }
                });

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
                
                // BRASA PROTEIN BOX LIFECYCLE ENGINE - FASE 1: Instantiation
                if (compliance.status !== 'REJECTED') {
                    // FASE 3: Duplicate & Replay Protection (Receiving)
                    const existingBox = await prisma.proteinBox.findFirst({
                        where: {
                            store_id: verifiedStoreId,
                            barcode: barcode
                        }
                    });

                    if (existingBox) {
                        return res.status(409).json({ status: 'REJECTED', error: `Duplicate Scan Protection: Box ${barcode} has already been received into this store.` });
                    }

                    try {
                        const todayDate = new Date();
                        todayDate.setUTCHours(0,0,0,0);
                        
                        await prisma.$transaction(async (tx) => {
                            const newBox = await tx.proteinBox.create({
                                data: {
                                    tenant_id: Number(companyId),
                                    store_id: verifiedStoreId,
                                    barcode: barcode,
                                    gtin: finalGtin,
                                    lot_code: normalized.batch_number || null,
                                    product_name: compliance.specMatched?.protein_name || normalized.product_name || "Unknown",
                                    vendor: compliance.specMatched?.supplier || normalized.packer || "Unknown",
                                    received_weight_lb: finalWeight,
                                    available_weight_lb: finalWeight,
                                    status: 'RECEIVED',
                                    received_by: String(user.id || getUserId(user) || "SYSTEM"),
                                    source_receiving_event: scanEvent.id,
                                    business_date: todayDate,
                                }
                            });

                            await tx.boxLifecycleEvent.create({
                                data: {
                                    box_id: newBox.id,
                                    store_id: verifiedStoreId,
                                    event_type: 'RECEIVE',
                                    previous_status: 'RECEIVED',
                                    new_status: 'RECEIVED',
                                    triggered_by: String(user.id || getUserId(user) || "SYSTEM"),
                                    reason: 'Initial scan at Receiving Dock'
                                }
                            });
                        });
                    } catch (err: any) {
                        // Ignore P2002 (Double Validation / Repeated barcode) silently
                        if (err.code !== 'P2002') {
                            console.error('ProteinBox creation failed:', err.message);
                        }
                    }
                }
            }

            if (compliance.status === 'REJECTED') {
                 if (user.role === 'admin' || user.role === 'director' || user.role === 'owner' || user.role === 'partner') {
                    const roster = await prisma.companyProduct.findMany({ where: { company_id: companyId }, select: { id: true, name: true }});
                    return res.json({ 
                        status: 'UNMAPPED_REVIEW_ALLOWED', 
                        gtin: finalGtin, 
                        product_code: normalized.product_code,
                        raw_barcode: barcode,
                        details: compliance.details,
                        roster: roster
                    });
                }
                return res.json({ status: 'REVIEW_REQUIRED', details: compliance.details });
            }
            
            return res.json({ 
                status: compliance.status === 'ACCEPTED' ? 'APPROVED' : compliance.status, 
                protein: compliance.specMatched?.protein_name || normalized.product_name, 
                weight: finalWeight,
                details: compliance.details 
            });

        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Scan Barcode Error:', error);
            res.status(500).json({ error: error.message ? `CRASH TRACE: ${error.message.substring(0, 150)}` : 'Internal Server Error' });
        }
    },

    forceAcceptBarcode: async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const { barcode, weight, store_id, original_protein } = req.body;
            let companyId = requireTenant((req as any).user);
            let storeId = store_id || user.storeId;
            let verifiedStoreId: number | null = null;
            if (storeId) verifiedStoreId = parseInt(storeId as string, 10);

            let finalWeight = weight;
            if (!finalWeight) {
                // simple fallback if weight wasn't correctly passed
                finalWeight = 0;
            }

            if (verifiedStoreId) {
                // Send Critical Alert
                await AlertEngine.trigger(
                    verifiedStoreId, 
                    'CRITICAL', 
                    'COMPLIANCE', 
                    'Emergency Force Receive (Garcia Rule Override Actuated)', 
                    { barcode, weight: finalWeight, user: user.first_name }
                );

                const todayDate = new Date();
                todayDate.setUTCHours(0,0,0,0);

                await prisma.$transaction(async (tx) => {
                    const newBox = await tx.proteinBox.create({
                        data: {
                            tenant_id: Number(companyId),
                            store_id: verifiedStoreId,
                            barcode: barcode,
                            gtin: barcode.substring(0, 14), // fallback
                            product_name: "UNMAPPED OVERRIDE - " + (original_protein || "Unknown"),
                            vendor: "Unknown override",
                            received_weight_lb: finalWeight,
                            available_weight_lb: finalWeight,
                            status: 'RECEIVED',
                            received_by: String(user.id || getUserId(user) || "SYSTEM"),
                            business_date: todayDate,
                        }
                    });

                    await tx.boxLifecycleEvent.create({
                        data: {
                            box_id: newBox.id,
                            store_id: verifiedStoreId,
                            event_type: 'RECEIVE',
                            previous_status: 'RECEIVED',
                            new_status: 'RECEIVED',
                            triggered_by: String(user.id || getUserId(user) || "SYSTEM"),
                            reason: 'Manager Override - Forced Receive'
                        }
                    });
                });
            }

            return res.json({ 
                status: 'APPROVED', 
                protein: "UNMAPPED OVERRIDE", 
                weight: finalWeight
            });

        } catch (error: any) {
            console.error('Force Accept Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },

    reviewMap: async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const { gtin, product_code, protein_name, raw_barcode, weight, store_id } = req.body;
            
            if (user.role !== 'admin' && user.role !== 'director' && user.role !== 'owner' && user.role !== 'partner') {
                return res.status(403).json({ error: 'Unauthorized to map barcodes' });
            }

            let companyId = requireTenant((req as any).user); 
            let storeId = store_id || user.storeId;
            
            if (user.scope && user.scope.type === 'COMPANY') {
                companyId = user.scope.companyId;
            } else if (storeId) {
                const store = await prisma.store.findUnique({ where: { id: parseInt(storeId as string, 10) }});
                if (store) companyId = store.company_id;
            }

            // Locate Master Spec (User selected this from Roster List)
            const specToLink = await prisma.corporateProteinSpec.findFirst({
                where: { protein_name, company_id: companyId }
            });

            if (!specToLink) {
                 return res.status(400).json({ error: 'Selected Master Protein Spec not found for this tenant.' });
            }

            const isWeak = !gtin && !product_code;

            // 1. Create Interstitial Rule (Zero-Trust protection, leave Master Table alone)
            await prisma.receivingRecognitionRule.create({
                data: {
                    company_id: companyId,
                    protein_spec_id: specToLink.id,
                    gtin: gtin || null,
                    normalized_product_code: product_code || null,
                    raw_barcode_pattern: isWeak ? raw_barcode : null,
                    match_strength: isWeak ? 'WEAK' : 'STRONG',
                    created_by: user.id
                }
            });

            // 2. Audit Trail
            await prisma.auditEvent.create({
                data: {
                    action: 'RECEIVING_MAPPING_CONFIRMED',
                    actor: user.id,
                    store_id: storeId ? parseInt(storeId.toString(), 10) : null,
                    payload: { proteinSpecId: specToLink.id, gtin, product_code, raw_barcode, weight } as any
                }
            });

            const mockNormalizedBarcode = {
                raw_barcode: raw_barcode || '',
                barcode_family: 'MANUAL_ASSISTED',
                barcode_type: 'INTERNAL_PROXY',
                confidence_score: 1.0,
                product_code: product_code || '',
                product_name: protein_name || '',
                gtin: gtin || null,
                net_weight_lb: weight || null,
                net_weight_kg: weight ? weight * 0.453592 : null,
                unit: 'LB',
                lot: null,
                pack_date: null,
                expiry_date: null,
                serial: null,
                status: 'valid' as const,
                warnings: [],
                source_parser: 'ASSISTED_MAP'
            };

            // ZERO-TRUST RE-EVALUATION
            const engineResult = await ComplianceEngine.evaluate(mockNormalizedBarcode, companyId);

            // Trilha de Segurança Pós-Reprocessamento
            await prisma.auditEvent.create({
                data: {
                    action: 'REPROCESS_EXECUTED',
                    actor: user.id,
                    store_id: storeId ? parseInt(storeId.toString(), 10) : null,
                    payload: { 
                        engineStatus: engineResult.status, 
                        gtin,
                        reason_code: engineResult.reason_code 
                    } as any
                }
            });

            // Process the scan now that it's mapped (Reprocessing proxy)
            if (storeId && (engineResult.status === 'ACCEPTED' || engineResult.status === 'ACCEPTED_WITH_WARNING')) {
                 await prisma.barcodeScanEvent.create({
                        data: {
                            store_id: parseInt(storeId.toString(), 10),
                            scanned_barcode: raw_barcode,
                            gtin: gtin || null,
                            is_approved: true,
                            protein_name: engineResult.specMatched?.protein_name || specToLink.protein_name,
                            weight: weight || 0,
                            metadata: { assistedMappingReprocessed: true, engineStatus: engineResult.status } as any
                        }
                 });
            }

            // Em caso de erro na reavaliação de peso, propaga o status real (ex: ACCEPTED_WITH_WARNING)
            res.json({ 
                success: true, 
                status: engineResult.status, 
                protein: engineResult.specMatched?.protein_name || specToLink.protein_name,
                details: engineResult.details
            });

        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
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
        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
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
        } catch (err: any) {
            if (err?.name === 'AuthContextMissingError') {
                return res.status(err.status).json({ error: err.message });
            }
            return res.status(500).json({ error: "Failed to purge AI data" });
        }
    },

    rawSpecs: async (req: any, res: any) => {
        try {
            const specs = await prisma.corporateProteinSpec.findMany();
            return res.json(specs);
        } catch (err: any) {
            if (err?.name === 'AuthContextMissingError') {
                return res.status(err.status).json({ error: err.message });
            }
            return res.status(500).json({ error: "Failed to fetch raw specs" });
        }
    }
};
