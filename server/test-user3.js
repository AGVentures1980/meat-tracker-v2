require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const user = await prisma.user.findFirst({ where: { email: { contains: 'addison' } } });
    console.log(JSON.stringify(user, null, 2));
}
run();
