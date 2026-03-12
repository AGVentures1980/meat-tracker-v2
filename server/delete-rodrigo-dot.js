const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: "postgresql://postgres:wQfTDRItZtZqQZrmVdDrtYpXQWbYhZzM@autorack.proxy.rlwy.net:19955/railway" } } });

async function deleteDotted() {
    try {
        const deleted = await prisma.user.deleteMany({
            where: { email: 'rodrigo.davila@texasdebrazil.com' }
        });
        console.log(`Deleted ${deleted.count} user(s).`);
    } catch (e) {
        console.error(e.message);
    }
    process.exit(0);
}

deleteDotted();
