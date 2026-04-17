import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const aliases = await prisma.supplierProductAlias.findMany();
  console.log('Aliases:', aliases);
}
run().finally(() => prisma.$disconnect());
