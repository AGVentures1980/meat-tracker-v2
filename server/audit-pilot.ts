import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const pilotStoreNames = ['Addison', 'Miami Beach', 'Las Vegas'];
  
  const stores = await prisma.store.findMany({
    where: { store_name: { in: pilotStoreNames } },
    include: {
      users: { select: { email: true, first_name: true, last_name: true, role: true } },
      area_manager: { select: { email: true, first_name: true, last_name: true } },
      meat_targets: { select: { id: true, protein: true, target: true, cost_target: true } }
    }
  });

  console.log(JSON.stringify(stores, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
