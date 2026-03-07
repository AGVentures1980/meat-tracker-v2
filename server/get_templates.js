const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const t = await prisma.storeTemplate.findMany();
  console.log(t.map(x => x.name + ' - ' + x.description));
}
main().finally(() => prisma.$disconnect());
