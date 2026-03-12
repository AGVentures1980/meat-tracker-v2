import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ where: { role: 'director', company_id: 'tdb-main' } });
  console.log(users);
}
main().catch(console.error).finally(() => prisma.$disconnect());
