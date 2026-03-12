import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tdbCompany = await prisma.company.findFirst({ where: { name: { contains: 'Texas de Brazil' } } });
  if (!tdbCompany) return;

  const exactCarlos = await prisma.user.findFirst({ where: { email: 'carlosrestrepo@texasdebrazil.com' } });
  if (!exactCarlos) {
    console.log('Não encontrei a conta exata.');
    return;
  }

  // Transferir as lojas piloto (Addison, Miami, Vegas) para a conta exata dele
  await prisma.store.updateMany({
    where: { 
       company_id: tdbCompany.id, 
       store_name: { in: ['Addison', 'Las Vegas', 'Miami Beach'] } 
    },
    data: {
       area_manager_id: exactCarlos.id
    }
  });

  // Garantir que a exata Carlos Account tenha role de Area Manager
  await prisma.user.update({
      where: { id: exactCarlos.id },
      data: { role: 'area_manager' }
  });

  console.log('✅ Lojas Piloto transferidas para a conta Original e Exata do Carlos: carlosrestrepo@texasdebrazil.com');
}

main().catch(console.error).finally(() => prisma.$disconnect());
