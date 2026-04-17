import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.receivingRecognitionRule.findMany().then(r => console.log(JSON.stringify(r.slice(0, 5), null, 2))).finally(() => prisma.$disconnect());
