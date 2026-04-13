const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.$executeRawUnsafe("DELETE FROM _prisma_migrations WHERE migration_name LIKE '2099010100000%';").then(() => console.log('Cleaned')).finally(() => prisma.$disconnect());
