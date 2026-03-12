import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tdbCompany = await prisma.company.findFirst({ where: { name: { contains: 'Texas' } } });
  const fdcCompany = await prisma.company.findFirst({ where: { name: { contains: 'Fogo' } } });

  const tdbStores = await prisma.store.findMany({
    where: { company_id: tdbCompany?.id, store_name: { in: ['Addison', 'Miami Beach', 'Las Vegas'] } },
    select: { id: true, store_name: true, area_manager_id: true }
  });
  
  console.log('TDB', tdbStores);

  const fdcStores = await prisma.store.findMany({
    where: { company_id: fdcCompany?.id, store_name: { in: ['Addison', 'Miami Beach', 'Las Vegas'] } },
    select: { id: true, store_name: true, area_manager_id: true }
  });

  console.log('FDC', fdcStores);
}

main().catch(console.error).finally(() => prisma.$disconnect());
