const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { ReceivingController } = require('./dist/controllers/ReceivingController');

async function test() {
    const req = {
        user: { role: 'admin', storeId: null, first_name: 'Admin', last_name: 'Test' },
        body: {
            barcode: '0190076338879475320100083511260312210201000787',
            weight: 8.35,
            gtin: '00763388794753',
            store_id: undefined
        }
    };
    const res = {
        status: (code) => { console.log('Status:', code); return res; },
        json: (data) => { console.log('JSON:', data); }
    };
    
    try {
        await ReceivingController.scanBarcode(req, res);
    } catch(e) {
        console.error("FATAL ERROR", e);
    }
}
test();
