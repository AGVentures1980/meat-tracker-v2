const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: "postgresql://postgres:wQfTDRItZtZqQZrmVdDrtYpXQWbYhZzM@autorack.proxy.rlwy.net:19955/railway" } } });

async function getAreaManagers() {
    try {
        const managers = await prisma.user.findMany({
            where: { email: { contains: 'texas', mode: 'insensitive' } },
            select: { email: true, role: true, store_id: true, first_name: true, last_name: true }
        });
        console.log("TEXAS USERS:", JSON.stringify(managers, null, 2));
    } catch(e) {
        console.error(e.message);
    }
    process.exit(0);
}
getAreaManagers();
