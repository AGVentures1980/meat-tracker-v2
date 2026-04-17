import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ProductionEngineService } from '../services/ProductionEngineService';

const prisma = new PrismaClient();

export class ProductionEngineController {

    static async startProduction(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const storeId = user.storeId;
            const { boxId, productType } = req.body;

            if (!boxId || !productType) {
                return res.status(400).json({ success: false, error: 'boxId and productType are required' });
            }

            const batch = await prisma.proteinTransformationBatch.create({
                data: { storeId: storeId, productType, status: 'OPEN', createdBy: user.id }
            });

            return res.json({ success: true, batch });
        } catch (error: any) {
            return res.status(500).json({ success: false, error: 'Failed to start production' });
        }
    }

    static async recordProduction(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const { batchId, boxId, weightToProduceLbs, unitsProduced } = req.body;

            if (!batchId || !boxId || !weightToProduceLbs) {
                return res.status(400).json({ success: false, error: 'Missing batch parsing elements' });
            }

            const matchResult = await ProductionEngineService.recordProduction({
                batchId,
                boxId,
                weightToProduceLbs: Number(weightToProduceLbs),
                unitsProduced: unitsProduced ? Number(unitsProduced) : undefined
            });

            return res.json(matchResult);
        } catch (error: any) {
            return res.status(400).json({ success: false, error: error.message });
        }
    }
}
