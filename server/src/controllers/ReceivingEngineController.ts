import { Request, Response } from 'express';
import { ReceivingEngineService } from '../services/ReceivingEngineService';

export class ReceivingEngineController {

    // POST /api/v1/receiving/scan
    static async scanWithConcurrencyLock(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const storeId = user.storeId;
            const { shipmentId, scannedBarcode, extractedWeightLb, confidenceScore, canonicalFamilyId } = req.body;

            if (!shipmentId) {
                return res.status(400).json({ success: false, error: 'Shipment ID is missing. Explicit shipment resolution is LOCKED and mandatory.' });
            }

            const matchResult = await ReceivingEngineService.scanWithConcurrencyLock({
                storeId,
                shipmentId,
                scannedBarcode,
                extractedWeightLb: Number(extractedWeightLb),
                confidenceScore: confidenceScore ? Number(confidenceScore) : undefined,
                canonicalFamilyId
            });

            return res.json({ success: true, data: matchResult });

        } catch (error: any) {
             return res.status(500).json({ success: false, error: error.message || 'Receiving transaction failed.' });
        }
    }

    // POST /api/v1/receiving/confirm (Manual review bypass)
    static async confirmReview(req: Request, res: Response) {
        return res.json({ success: true, status: 'CONFIRMED' });
    }

    // POST /api/v1/receiving/override 
    static async overrideMatch(req: Request, res: Response) {
        return res.json({ success: true, status: 'OVERRIDDEN' });
    }
}
