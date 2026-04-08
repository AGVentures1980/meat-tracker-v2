import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { BarcodeDecisionEngineV2 } from '../services/BarcodeDecisionEngineV2';

const prisma = new PrismaClient();

export const BarcodeController = {
    parseBarcode: async (req: Request, res: Response) => {
        try {
            const { raw_barcode, context, session_id, store_id } = req.body;
            
            if (!raw_barcode) {
                return res.json({ status: 'INVALID', reason_code: 'MISSING_BARCODE' });
            }

            const storeIdNum = store_id ? parseInt(store_id, 10) : 1;
            const contextSafe = context || 'RECEIVING';
            const sessionIdSafe = session_id || 'anonymous_session';

            const normalized = await BarcodeDecisionEngineV2.evaluate(
                raw_barcode, 
                storeIdNum, 
                contextSafe, 
                sessionIdSafe
            );

            // Sprint 5 - Logger Obligation
            await prisma.barcodeDecisionLog.create({
                data: {
                    store_id: storeIdNum,
                    raw_barcode: raw_barcode,
                    cleaned_barcode: normalized.cleaned_barcode || "",
                    context: contextSafe,
                    status: normalized.final_status,
                    reason_code: normalized.reason_code || null,
                    attempted_parsers: ['GS1_STRICT', 'NZ_PROPRIETARY'],
                    scores: [], // Can serialize if we pass back array mapping in engine
                    selected_parser: normalized.source_parser || 'NONE',
                    runner_up_parser: normalized.runner_up_parser || 'NONE',
                    confidence_gap: normalized.confidence_gap || 0.0,
                }
            });

            if (normalized.final_status === 'UNKNOWN') {
                await prisma.unknownBarcodeLog.create({
                    data: {
                        store_id: storeIdNum,
                        raw_barcode: raw_barcode,
                        context: contextSafe,
                        reason: 'No parser exceeded 0.50 threshold'
                    }
                });
            }

            // Must always return 200 OK, with normalized payload
            return res.json({
                status: normalized.final_status,
                reason_code: normalized.reason_code || 'SUCCESS',
                normalized_object: normalized
            });

        } catch (error: any) {
            if (error?.name === 'AuthContextMissingError') {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Barcode Parse Endpoint Crash Avoidance:', error);
            // Must return 200 OK with fail status so hardware wedge doesn't crash
            return res.json({
                status: 'INVALID',
                reason_code: 'API_EXCEPTION',
                message: error.message
            });
        }
    }
};
