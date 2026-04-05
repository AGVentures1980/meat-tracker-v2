require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const users = await prisma.user.findMany({ 
        where: { email: { contains: 'addison', mode: 'insensitive' } } 
    });
    console.log(JSON.stringify(users, null, 2));
}
run();
