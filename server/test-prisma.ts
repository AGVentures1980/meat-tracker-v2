import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({
    where: { email: { in: ['rafael@fogo.com', 'rodrigodavila@texasdebrazil.com'] } },
    select: { email: true, role: true }
  });
  console.log(users);
}
main().catch(console.error).finally(() => prisma.$disconnect());
