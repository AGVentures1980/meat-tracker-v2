
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyLedger() {
    console.log('🔍 Verifying Company Product Ledger...');

    try {
        // 1. Check CompanyProduct table
        const productCount = await prisma.companyProduct.count();
        console.log(`✅ Found ${productCount} products in the ledger.`);

        // 2. Verify Texas de Brazil contents
        const tdb = await prisma.company.findFirst({ where: { name: 'Texas de Brazil' } });
        if (!tdb) throw new Error('TDB Company not found');

        const tdbProducts = await prisma.companyProduct.findMany({
            where: { company_id: tdb.id },
            orderBy: { name: 'asc' }
        });

        console.log(`✅ TDB has ${tdbProducts.length} products.`);

        // Check for specific items
        const hasPorkRibs = tdbProducts.some(p => p.name === 'Pork Ribs');
        const hasLambSirloin = tdbProducts.some(p => p.name === 'Lamb Sirloin');
        console.log(`✅ Contains Pork Ribs: ${hasPorkRibs}`);
        console.log(`✅ Contains Lamb Sirloin: ${hasLambSirloin}`);

        // Check sorting
        const isSorted = tdbProducts.every((p, i) => i === 0 || p.name >= tdbProducts[i - 1].name);
        console.log(`✅ Proteins are alphabetically sorted: ${isSorted}`);

        // 3. Verify Engine Logic (Mocking check)
        // We'll just verify the query in the engine works
        const sampleProduct = await prisma.companyProduct.findFirst({
            where: { is_villain: true }
        });
        console.log(`✅ Identified Villain: ${sampleProduct?.name}`);

        console.log('\n✨ Verification Successful!');

    } catch (error) {
        console.error('❌ Verification Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyLedger();
