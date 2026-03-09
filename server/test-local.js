const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testQuery() {
    try {
        console.log("Fetching stores...");
        const stores = await prisma.store.findMany({
            include: { meat_targets: true },
            orderBy: { store_name: 'asc' }
        });
        console.log(`Found ${stores.length} stores.`);
        
        console.log("Fetching products...");
        const products = await prisma.companyProduct.findMany();
        console.log(`Found ${products.length} products.`);
        
        console.log("Success! DB is fine.");
    } catch(e) {
        console.error("PRISMA CRASHED!", e);
    } finally {
        await prisma.$disconnect();
    }
}
testQuery();
