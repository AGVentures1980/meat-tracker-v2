const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: "postgresql://postgres:wQfTDRItZtZqQZrmVdDrtYpXQWbYhZzM@autorack.proxy.rlwy.net:19955/railway" } } });
async function run() {
    const user = await prisma.user.findFirst({ where: { email: 'rodrigodavila@texasdebrazil.com' } });
    console.log(user ? user.director_region : "Not found");
    process.exit(0);
}
run();
