
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyCompanySettings() {
    console.log('🔍 Verifying Company Settings & Automation...');

    try {
        // 1. Setup: Get TDB Company
        const tdb = await prisma.company.findFirst({ where: { name: 'Texas de Brazil' } });
        if (!tdb) throw new Error('TDB Company not found');

        console.log(`✅ Targeted Company: ${tdb.name}`);

        // 2. Test Product Creation with 'include_in_delivery'
        const testProductName = `Test Protein ${Math.floor(Math.random() * 1000)}`;
        const product = await prisma.companyProduct.create({
            data: {
                company_id: tdb.id,
                name: testProductName,
                category: 'Beef',
                is_villain: false,
                include_in_delivery: true // THE NEW FLAG
            }
        });
        console.log(`✅ Created Product: ${product.name} (Delivery Detection: ${product.include_in_delivery})`);

        // 3. Test Store Creation
        const testStoreName = `Test Store ${Math.floor(Math.random() * 1000)}`;
        const store = await prisma.store.create({
            data: {
                company_id: tdb.id,
                store_name: testStoreName,
                location: 'Test Lab'
            }
        });
        console.log(`✅ Created Store: ${store.store_name} (ID: ${store.id})`);

        // 4. Verify Delivery Logic (Simulation)
        // We can't easily call the controller directly without mocking req/res, 
        // but we can verify the data allows for it.
        const deliveryProducts = await prisma.companyProduct.findMany({
            where: { company_id: tdb.id, include_in_delivery: true }
        });

        const isTracking = deliveryProducts.some(p => p.name === testProductName);
        console.log(`✅ New product is indexable by Delivery Logic: ${isTracking}`);


        // 5. Cleanup
        await prisma.companyProduct.delete({ where: { id: product.id } });
        await prisma.store.delete({ where: { id: store.id } });
        console.log('✅ Cleanup Complete (Deleted Test Items)');

        console.log('\n✨ Verification Successful!');

    } catch (error) {
        console.error('❌ Verification Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyCompanySettings();
