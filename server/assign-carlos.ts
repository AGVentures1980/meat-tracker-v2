import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tdbCompany = await prisma.company.findFirst({ where: { name: { contains: 'Texas de Brazil' } } });
  
  if (!tdbCompany) {
    console.error('Empresa Texas de Brazil não encontrada.');
    return;
  }

  // Pegar qualquer loja TDB para amarrar o Area Manager (como ele vira owner no stores_area, o initial store_id pode ser qualquer um)
  const anyTdbStore = await prisma.store.findFirst({ where: { company_id: tdbCompany.id } });

  // 1. Criar o Carlos Restrepo como AREA MANAGER (Não existia no Banco)
  let carlos = await prisma.user.findFirst({ where: { email: 'crestrepo@texasdebrazil.com' } });
  
  if (!carlos) {
     carlos = await prisma.user.create({
        data: {
           email: 'crestrepo@texasdebrazil.com',
           first_name: 'Carlos',
           last_name: 'Restrepo',
           password_hash: '$2b$10$.BihS7oM3Z1h0lD9UioUceF5N98zUaK.V9tQ7M/1zV2Y.o320v96q', // password123
           role: 'area_manager',
           store: { connect: { id: anyTdbStore?.id } }
        }
     });
     console.log('✅ Usuário Carlos Restrepo (Area Manager) Criado.');
  } else {
     // Garantir a role correta caso ele existisse quebrado
     await prisma.user.update({
        where: { id: carlos.id },
        data: { role: 'area_manager' }
     });
  }

  // 2. Transferir a posse das lojas piloto do Rodrigo D'Avila (Diretor) para o Carlos Restrepo (Area Manager)
  await prisma.store.updateMany({
    where: { 
       company_id: tdbCompany.id, 
       store_name: { in: ['Addison', 'Las Vegas', 'Miami Beach'] } 
    },
    data: {
       area_manager_id: carlos.id
    }
  });

  console.log('✅ Carlos Restrepo agora é o dono (Area Manager) oficial das 3 lojas Piloto do Texas de Brazil.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
