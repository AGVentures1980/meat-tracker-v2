const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
    console.log("Fetching users and stores...");
    const user = await prisma.user.findFirst({ where: { email: 'contato@alexandregarcia.com' } });
    if (!user) { console.log("User not found: contato@alexandregarcia.com. Trying agv.alexandre@gmail.com..."); }
    const adminUser = await prisma.user.findFirst({ where: { role: 'director' } });
    
    console.log("Director User:", adminUser ? adminUser.email : 'None', "Company:", adminUser ? adminUser.company_id : 'N/A');
    if (adminUser && adminUser.company_id) {
        const stores = await prisma.store.findMany({ where: { company_id: adminUser.company_id } });
        console.log(`Stores for ${adminUser.company_id}:`, stores.map(s => `ID: ${s.id} - ${s.store_name}`));
    }
}
test().finally(() => prisma.$disconnect());
