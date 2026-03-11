import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const fdcId = '43670635-c205-4b19-99d4-445c7a683730';
  const products = await prisma.companyProduct.findMany({ where: { company_id: fdcId } });
  console.log('FDC Products:', products.map(p => p.name));
}
main().catch(console.error).finally(() => prisma.$disconnect());
