import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const brands = await prisma.competitorBrand.findMany();
  console.log('CompetitorBrands:', brands.map(b => ({ id: b.id, name: b.name })));
}

run().finally(() => prisma.$disconnect());
