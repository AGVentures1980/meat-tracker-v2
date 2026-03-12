import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const companies = await prisma.company.findMany({
    where: { name: { contains: 'Brazil' } },
    select: { name: true }
  });
  console.log('TDB:', companies);
  const fogos = await prisma.company.findMany({
    where: { name: { contains: 'Fogo' } },
    select: { name: true }
  });
  console.log('FDC:', fogos);
}
main().catch(console.error).finally(() => prisma.$disconnect());
