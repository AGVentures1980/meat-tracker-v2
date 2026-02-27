const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.store.findFirst().then(s => console.log('First Store ID:', s ? s.id : 'NONE')).finally(() => prisma.$disconnect());
