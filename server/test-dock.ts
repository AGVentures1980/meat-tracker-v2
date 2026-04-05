import { PrismaClient } from '@prisma/client';
import { ReceivingController } from './src/controllers/ReceivingController';

const prisma = new PrismaClient();

async function test() {
    console.log("Starting test...");
    const req: any = {
        user: { role: 'manager', storeId: "3", first_name: 'Store', last_name: 'Addison' },
        body: {
            barcode: '0190076338888477320100081811260310210201001625',
            weight: 8.35,
            gtin: '00763388884773',
            store_id: 3
        }
    };
    const res: any = {
        status: (code: any) => { console.log('Status:', code); return res; },
        json: (data: any) => { console.log('JSON:', data); }
    };
    
    try {
        await ReceivingController.scanBarcode(req, res);
    } catch(e) {
        console.error("FATAL ERROR", e);
    }
}
test().then(() => {
    console.log("Done");
    process.exit(0);
});
