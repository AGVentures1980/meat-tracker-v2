const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Checking Outlets for store 15...");
    const outlets = await prisma.outlet.findMany({
        where: { store_id: 15 }
    });
    console.log(`Found ${outlets.length} outlets for Store 15:`, outlets);
    
    console.log("Checking Store 15...");
    const store = await prisma.store.findUnique({
        where: { id: 15 }
    });
    console.log(`Store 15:`, store);
}
main().catch(console.error).finally(() => prisma.$disconnect());
