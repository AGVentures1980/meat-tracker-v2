import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tdbCompany = await prisma.company.findFirst({ where: { name: { contains: 'Texas de Brazil' } } });
  
  if (!tdbCompany) {
    console.error('Empresa Texas de Brazil não encontrada.');
    return;
  }

  // 1. Usar o Diretor Existente (Rodrigo D'Avila para liderar o Piloto)
  const rodrigo = await prisma.user.findFirst({ where: { email: 'rodrigodavila@texasdebrazil.com' } });
  if (!rodrigo) {
     console.log('Rodrigo D\'Avila não encontrado.');
     return;
  }

  // 2. Garantir Miami Beach (Criar)
  let miamiBeach = await prisma.store.findFirst({ where: { store_name: 'Miami Beach', company_id: tdbCompany.id } });
  if (!miamiBeach) {
     miamiBeach = await prisma.store.create({
       data: {
          company_id: tdbCompany.id,
          store_name: 'Miami Beach',
          location: 'TDB-MB',
          country: 'USA',
          timezone: 'America/New_York',
          is_pilot: true,
          baseline_loss_rate: 18,
          baseline_yield_ribs: 75,
          baseline_overproduction: 15,
          baseline_forecast_accuracy: 65,
          baseline_consumption_pax: 1.80,
          baseline_cost_per_lb: 10.50,
          annual_volume_lbs: 200000,
          baseline_yoy_pax: 2.1,
          baseline_trailing_pax: 2.0,
          target_cost_guest: 11.50,
          target_lbs_guest: 1.80,
          dinner_price: 65.00,
          is_lunch_enabled: false,
          lunch_price: 35.00,
          area_manager_id: rodrigo.id,
          region: 'East Coast'
       }
     });
     console.log('Loja Miami Beach Criada.');
  }

  // 3. Vincular Addison e Las Vegas ao Rodrigo
  await prisma.store.updateMany({
    where: { 
       company_id: tdbCompany.id, 
       store_name: { in: ['Addison', 'Las Vegas'] } 
    },
    data: {
       area_manager_id: rodrigo.id,
       is_pilot: true
    }
  });

  const allPilotStores = await prisma.store.findMany({
    where: { company_id: tdbCompany.id, store_name: { in: ['Addison', 'Las Vegas', 'Miami Beach'] } }
  });

  // 4. Injetar Usuários (Managers)
  const managersToCreate = [
    { email: 'addison@texasdebrazil.com', store_name: 'Addison' },
    { email: 'lasvegas@texasdebrazil.com', store_name: 'Las Vegas' },
    { email: 'miamibeach@texasdebrazil.com', store_name: 'Miami Beach' }
  ];

  for (const m of managersToCreate) {
     const store = allPilotStores.find(s => s.store_name === m.store_name);
     if (!store) continue;

     const ext = await prisma.user.findFirst({ where: { email: m.email } });
     if (!ext) {
        await prisma.user.create({
           data: {
              email: m.email,
              password_hash: '$2b$10$.BihS7oM3Z1h0lD9UioUceF5N98zUaK.V9tQ7M/1zV2Y.o320v96q', // password123
              role: 'manager',
              company_id: tdbCompany.id,
              store: { connect: { id: store.id } }
           }
        });
        console.log(`User ${m.email} created.`);
     } else {
        await prisma.user.update({
           where: { id: ext.id },
           data: { store: { connect: { id: store.id } } }
        });
        console.log(`User ${m.email} updated & connected to store.`);
     }
  }

  console.log('🚀 Piloto Texas de Brazil: Lojas e Gerentes injetados. ***Metas não injetadas (Aguardando Show Room Pitch)***.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
