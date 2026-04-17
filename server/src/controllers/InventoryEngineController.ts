import { Request, Response } from 'express';
import { InventoryEngineService } from '../services/InventoryEngineService';

export class InventoryEngineController {

    static async submitWeeklyInventory(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const storeId = user.storeId;
            const { cycleId, proteinId, countedLbs, forceWarningOverride } = req.body;

            if (!cycleId || !proteinId || countedLbs === undefined) {
                return res.status(400).json({ success: false, error: 'Missing inventory baseline arguments' });
            }

            const result = await InventoryEngineService.submitWeeklyInventory({
                storeId,
                cycleId,
                proteinId,
                countedLbs: Number(countedLbs),
                forceWarningOverride
            });

            if (result.success === false) {
                 return res.status(400).json(result);
            }

            return res.json(result);

        } catch (error: any) {
             if (error.message && error.message.includes('CRITICAL INVENTORY BLOCK')) {
                 return res.status(403).json({ success: false, error: error.message });
             }
             return res.status(500).json({ success: false, error: 'Inventory Engine sync failed.' });
        }
    }
}
