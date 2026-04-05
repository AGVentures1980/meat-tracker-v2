require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        console.log("Fetching all Corporate Protein Specs to clean up GTINs...");
        const specs = await prisma.corporateProteinSpec.findMany();
        let fixedCount = 0;

        for (const spec of specs) {
            const code = spec.approved_item_code;
            if (code.length > 14) {
                const gtinMatch = code.replace(/[\(\)\[\]\s]/g, '').match(/(01|02)(\d{14})/);
                if (gtinMatch) {
                    const extractedGtin = gtinMatch[2];
                    console.log(`Fixing corrupted spec ${spec.protein_name}: ${code} -> ${extractedGtin}`);
                    await prisma.corporateProteinSpec.update({
                        where: { id: spec.id },
                        data: { approved_item_code: extractedGtin }
                    });
                    fixedCount++;
                } else if (code.length > 20) {
                     const bruteGtin = code.replace(/[\(\)\[\]\s]/g, '').substring(2, 16);
                     if(/^\d{14}$/.test(bruteGtin)) {
                         console.log(`Brute fixing corrupted spec ${spec.protein_name}: ${code} -> ${bruteGtin}`);
                         await prisma.corporateProteinSpec.update({
                             where: { id: spec.id },
                             data: { approved_item_code: bruteGtin }
                         });
                         fixedCount++;
                     }
                }
            }
        }
        
        console.log(`Cleanup complete. Fixed ${fixedCount} corrupted specs.`);
    } catch(err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}
run();
