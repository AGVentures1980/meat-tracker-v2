import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const users = await prisma.user.findMany({ where: { email: { contains: 'smoke' } } });
  console.log("SMOKE USERS:", users.length);
}
run();
