import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst({
    where: { name: { contains: 'Outback' } }
  });
  console.log('COMPANY:', company);
}

main().finally(() => prisma.$disconnect());
