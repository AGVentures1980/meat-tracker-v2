import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ 
    where: { 
      OR: [
        { first_name: { contains: 'Carlos' } },
        { email: { contains: 'carlos' } },
        { email: { contains: 'restrepo' } }
      ]
    },
    select: { id: true, email: true, first_name: true, role: true, store: { select: { company: { select: { name: true } } } } }
  });
  console.log(JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
