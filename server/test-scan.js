require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    console.log('Testing scan mock logic...');
    try {
        const barcode = " 0190076338888514320100062011260217210201004683";
        const gtin = "90076338888514";
        const specs = await prisma.corporateProteinSpec.findMany();
        
        console.log(`Found ${specs.length} specs in DB`);
        const spec = specs.find(s => {
            const cleanAppCode = s.approved_item_code.replace(/\D/g, '');
            const cleanGtin = gtin ? gtin.replace(/\D/g, '') : '';
            return (
                barcode.includes(s.approved_item_code) ||
                s.approved_item_code.includes(gtin) ||
                (cleanGtin && cleanAppCode.includes(cleanGtin)) ||
                barcode === s.approved_item_code ||
                cleanAppCode === barcode.replace(/\D/g, '')
            );
        });
        
        console.log('Matched spec:', spec);
    } catch (e) {
        console.error('CRASH!', e);
    }
}
run();
