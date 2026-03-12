const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: "postgresql://postgres:wQfTDRItZtZqQZrmVdDrtYpXQWbYhZzM@autorack.proxy.rlwy.net:19955/railway" } } });

async function run() {
    try {
        const users = await prisma.user.findMany({
            where: { email: { contains: 'carlos', mode: 'insensitive' } },
            select: { id: true, email: true, role: true, store_id: true }
        });
        
        const csilva = await prisma.user.findMany({
            where: { email: { contains: 'csilva', mode: 'insensitive' } },
            select: { id: true, email: true, role: true, store_id: true }
        });
        
        console.log("CARLOS USERS:", JSON.stringify(users, null, 2));
        console.log("CSILVA USERS:", JSON.stringify(csilva, null, 2));
    } catch(e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
run();
