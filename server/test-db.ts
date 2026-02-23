import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const users = await prisma.user.findMany({ where: { email: { contains: 'lexington' } } });
  console.log('Lexington user:', users);
  const store = await prisma.store.findFirst({ where: { location: { contains: 'Lexington' } }});
  console.log('Lexington store:', store);
}
run();
