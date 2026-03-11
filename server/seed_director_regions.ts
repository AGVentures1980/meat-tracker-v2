import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Applying Regions to Directors and Stores...');

  // 1. Get Fogo de Chao Company ID
  const fdc = await prisma.company.findFirst({
    where: { name: { contains: 'Fogo' } }
  });

  if (!fdc) {
    console.log('Skipping: Fogo de Chao company not found.');
    return;
  }

  // 2. Set Director Regions
  // Neri -> West Coast
  await prisma.user.updateMany({
    where: { email: 'neri@fogodechao.com' },
    data: { director_region: 'West Coast' }
  });

  // Jean -> East Coast
  await prisma.user.updateMany({
    where: { email: 'jean@fogodechao.com' },
    data: { director_region: 'East Coast' }
  });

  // 3. Update Store Regions based on simple Geography logic for pilot simulation
  // Fetch all FDC stores to update them
  const stores = await prisma.store.findMany({
    where: { company_id: fdc.id }
  });

  for (const store of stores) {
    const isWestCoast = 
      store.location.includes('CA') || 
      store.location.includes('TX') || 
      store.location.includes('NV') || 
      store.location.includes('WA') || 
      store.location.includes('OR') || 
      store.location.includes('AZ') || 
      store.location.includes('NM') || 
      store.location.includes('CO') || 
      store.store_name.includes('San ') || 
      store.store_name.includes('Las Vegas') || 
      store.store_name.includes('Dallas') || 
      store.store_name.includes('Houston') || 
      store.store_name.includes('Austin');

    const region = isWestCoast ? 'West Coast' : 'East Coast';
    
    await prisma.store.update({
      where: { id: store.id },
      data: { region }
    });
  }

  console.log(`Updated ${stores.length} FDC stores with East/West Coast regions.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
