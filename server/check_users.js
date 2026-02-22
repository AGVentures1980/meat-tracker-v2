const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany({
    select: { email: true, role: true, store_id: true }
}).then(users => {
    console.table(users);
}).finally(() => prisma.$disconnect());
