import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { DebugController } from '../controllers/DebugController';

const prisma = new PrismaClient();
const router = Router();

router.get('/db-sweep', async (req: Request, res: Response) => {
    try {
        const stores = await prisma.store.findMany({ include: { company: true }});
        const leakages = [];
        let count = 0;
        for (const s of stores) {
            if (s.store_name.toLowerCase().includes('outback') && s.company.name.toLowerCase().includes('fogo')) {
                 leakages.push(s);
                 count++;
            }
        }
        res.json({ totalStores: stores.length, leakedOutbackInFogo: count, leakages });
    } catch(e:any) { res.json({error:e.message}); }
});

router.get('/sweep', DebugController.cleanupTenantContamination);

export default router;
