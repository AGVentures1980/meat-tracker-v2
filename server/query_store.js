const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const store = await prisma.store.findUnique({ where: { id: 1 } });
  console.log("Store 1:", store);
  const user = await prisma.user.findFirst({ where: { role: 'director' } });
  console.log("Director User:", user);
}
main().catch(console.error).finally(() => prisma.$disconnect());
