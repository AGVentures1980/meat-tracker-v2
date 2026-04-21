import { StoreController } from './src/controllers/StoreController';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    const store = await prisma.store.findFirst({ where: { store_name: { contains: 'Orlando' } } });
    if (!store) { console.log('Store not found'); return; }
    
    // Test what happens simulating the actual frontend request!
    // Often when testing in node, we bypassed Express. Let's see what Express gets.
    const req = {
        headers: { 'x-company-id': store.company_id },
        user: { companyId: 'some-other-id', storeId: null, role: 'admin' }
    };
    
    const res = {
        status: (code: number) => ({ json: (data: any) => console.log('STATUS:', code, data) }),
        json: (data: any) => console.log(JSON.stringify(data, null, 2))
    };
    
    const controller = new StoreController();
    await controller.getStoreActions(req as any, res as any);
}
run();
