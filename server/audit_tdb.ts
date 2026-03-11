import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- TEXAS DE BRAZIL HIERARCHY AUDIT ---\n');

  // 1. Find TDB Company
  const tdb = await prisma.company.findFirst({
    where: { name: { contains: 'Texas' } }
  });

  if (!tdb) {
    console.log('Error: Texas de Brazil company not found.');
    return;
  }
  
  console.log(`Company ID: ${tdb.id} | Name: ${tdb.name}\n`);

  // 2. Find all stores for TDB
  const stores = await prisma.store.findMany({
    where: { company_id: tdb.id },
    include: {
      area_manager: true,
      users: {
        where: { role: { in: ['director', 'admin'] } } // Find directors attached to TDB stores
      }
    }
  });

  // Aggregate Directors
  const directors = new Map();
  stores.forEach(s => {
    s.users.forEach(u => {
      directors.set(u.email, { name: `${u.first_name} ${u.last_name}`, role: u.role, region: u.director_region });
    });
  });

  console.log('== DIRECTORS & ADMINS ==');
  if (directors.size === 0) console.log('None found.');
  directors.forEach((v, k) => {
    console.log(`- ${v.name} (${k}) | Role: ${v.role} | Region: ${v.region || 'None (Global)'}`);
  });
  console.log('');

  // Aggregate Area Managers
  const areaManagers = new Map();
  const unassignedStores: { name: string, region: string | null }[] = [];

  stores.forEach(s => {
    if (s.area_manager) {
      const am = s.area_manager;
      if (!areaManagers.has(am.email)) {
        areaManagers.set(am.email, { name: `${am.first_name} ${am.last_name}`, stores: [] });
      }
      areaManagers.get(am.email).stores.push({ name: s.store_name, region: s.region });
    } else {
      unassignedStores.push({ name: s.store_name, region: s.region });
    }
  });

  console.log('== AREA MANAGERS ==');
  if (areaManagers.size === 0) console.log('None found.');
  areaManagers.forEach((v: any, k: string) => {
    console.log(`\n👨‍💼 ${v.name} (${k})`);
    console.log(`   Assigned Stores (${v.stores.length}):`);
    v.stores.forEach((st: any) => console.log(`   - ${st.name} [Region: ${st.region || 'Global'}]`));
  });
  console.log('');

  console.log('== UNASSIGNED STORES (No Area Manager) ==');
  if (unassignedStores.length === 0) {
    console.log('All TDB stores are assigned to an Area Manager.');
  } else {
    console.log(`Found ${unassignedStores.length} unassigned stores. Sample:`);
    unassignedStores.slice(0, 10).forEach((st: any) => console.log(`   - ${st.name} [Region: ${st.region || 'Global'}]`));
    if (unassignedStores.length > 10) console.log(`   ...and ${unassignedStores.length - 10} more.`);
  }

}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
