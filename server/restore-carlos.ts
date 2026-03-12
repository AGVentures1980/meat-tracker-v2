import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Encontrar a loja TDB
  const tdbCompany = await prisma.company.findFirst({ where: { name: { contains: 'Texas de Brazil' } } });
  
  if (!tdbCompany) return;

  // Pegar a conta fake que eu criei agora a pouco
  const fakeCarlos = await prisma.user.findFirst({ where: { email: 'crestrepo@texasdebrazil.com' } });

  // Pegar as contas verdadeiras e antigas dele
  const realCarlosList = await prisma.user.findMany({
    where: { email: { in: ['carlos.restrepo@texasdebrazil.com', 'carlosrestrepo@texasdebrazil.com'] } },
    orderBy: { created_at: 'asc' }
  });

  if (realCarlosList.length === 0) {
     console.log('Não achei as contas antigas');
     return;
  }

  // A conta mais antiga é presumida como a verdadeira
  const realCarlos = realCarlosList[0];

  // Transferir as lojas piloto (Addison, Miami, Vegas) do Fake pro Real Carlos
  await prisma.store.updateMany({
    where: { 
       company_id: tdbCompany.id, 
       store_name: { in: ['Addison', 'Las Vegas', 'Miami Beach'] } 
    },
    data: {
       area_manager_id: realCarlos.id
    }
  });

  // Apagar o Fake Carlos para ele não se confundir
  if (fakeCarlos) {
      await prisma.user.delete({ where: { id: fakeCarlos.id } });
  }

  // Garantir que a real Carlos Account tenha role de Area Manager
  await prisma.user.update({
      where: { id: realCarlos.id },
      data: { role: 'area_manager' }
  });

  console.log('✅ Lojas Piloto transferidas para a conta Original do Carlos:', realCarlos.email);
}

main().catch(console.error).finally(() => prisma.$disconnect());
