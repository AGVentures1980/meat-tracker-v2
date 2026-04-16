import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const sr = await prisma.supplierBarcodeRule.findMany({ take: 30 });
    const rrr = await prisma.receivingRecognitionRule.findMany({ take: 30 });
    console.log("=== SupplierBarcodeRules ===");
    console.log(sr);
    console.log("=== ReceivingRecognitionRules ===");
    console.log(rrr);
}
run().then(() => prisma.$disconnect());
