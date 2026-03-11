import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const FDC_COMPANY_ID = '43670635-c205-4b19-99d4-445c7a683730';

const fdcProteins = [
  { name: 'Picanha', protein_group: 'BEEF', is_villain: true, lbs_per_skewer: 2.2, standard_target: 0.39 },
  { name: 'Fraldinha', protein_group: 'BEEF', is_villain: true, lbs_per_skewer: 2.5, standard_target: 0.15 },
  { name: 'Filet Mignon', protein_group: 'BEEF', is_villain: true, lbs_per_skewer: 2.0, standard_target: 0.12 },
  { name: 'Beef Ribs', protein_group: 'BEEF', is_villain: true, lbs_per_skewer: 4.0, standard_target: 0.15 },
  { name: 'Lamb Chops', protein_group: 'LAMB', is_villain: true, lbs_per_skewer: 1.5, standard_target: 0.08 },
  { name: 'Pork Ribs', protein_group: 'PORK', is_villain: false, lbs_per_skewer: 3.0, standard_target: 0.08 },
  { name: 'Bacon Wrapped Chicken', protein_group: 'POULTRY', is_villain: false, lbs_per_skewer: 2.5, standard_target: 0.05 },
  { name: 'Chicken Legs', protein_group: 'POULTRY', is_villain: false, lbs_per_skewer: 2.5, standard_target: 0.05 },
  { name: 'Linguica', protein_group: 'PORK', is_villain: false, lbs_per_skewer: 2.0, standard_target: 0.08 }
];

const fdcStores = [
  { name: 'Miami (South Beach)', state: 'FL', volume: 250000, pax: 1.80, cost: 11.50 },
  { name: 'New York (Midtown)', state: 'NY', volume: 380000, pax: 1.75, cost: 13.00 },
  { name: 'Chicago (River North)', state: 'IL', volume: 320000, pax: 1.85, cost: 12.00 },
  { name: 'Las Vegas (Hughes Center)', state: 'NV', volume: 450000, pax: 1.90, cost: 10.50 },
  { name: 'Dallas (Uptown)', state: 'TX', volume: 280000, pax: 1.82, cost: 11.00 },
  { name: 'Beverly Hills', state: 'CA', volume: 350000, pax: 1.78, cost: 14.50 },
  { name: 'Atlanta (Buckhead)', state: 'GA', volume: 260000, pax: 1.86, cost: 11.20 },
  { name: 'Boston (Copley)', state: 'MA', volume: 290000, pax: 1.80, cost: 12.50 }
];

async function main() {
  console.log('Seeding Fogo de Chão...');

  // 1. Create Products
  console.log('Creating Products...');
  for (const p of fdcProteins) {
    await prisma.companyProduct.upsert({
      where: { company_id_name: { company_id: FDC_COMPANY_ID, name: p.name } },
      update: {},
      create: {
        company_id: FDC_COMPANY_ID,
        name: p.name,
        protein_group: p.protein_group,
        is_villain: p.is_villain,
        lbs_per_skewer: p.lbs_per_skewer,
        standard_target: p.standard_target
      }
    });
  }

  // 2. Create Stores
  console.log('Creating Stores...');
  for (const s of fdcStores) {
    await prisma.store.upsert({
      where: { company_id_store_name: { company_id: FDC_COMPANY_ID, store_name: s.name } },
      update: {},
      create: {
        company_id: FDC_COMPANY_ID,
        store_name: s.name,
        location: `${s.name}, ${s.state}`,
        annual_volume_lbs: s.volume,
        baseline_consumption_pax: s.pax,
        baseline_cost_per_lb: s.cost
      }
    });
  }

  // 3. Create FDC Director
  const fdcDirectorEmail = 'rodrigo@fogo.com'; // Using Rodrigo as example director for FDC too
  const passwordHash = await bcrypt.hash('Fogo2026!', 10);
  
  await prisma.user.upsert({
    where: { email: fdcDirectorEmail },
    update: {
        role: 'director'
    },
    create: {
      email: fdcDirectorEmail,
      first_name: 'Rodrigo',
      last_name: 'FDC',
      password_hash: passwordHash,
      role: 'director',
      is_primary: true
    }
  });

  console.log('FDC Seeding Complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
