import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- TEXAS DE BRAZIL STORE PRUNING & ASSIGNMENT ---\n');

  // 1. Get TDB Company
  const tdb = await prisma.company.findFirst({
    where: { name: { contains: 'Texas' } }
  });

  if (!tdb) {
    console.error('Error: Texas de Brazil company not found.');
    return;
  }

  // 2. Fetch all current TDB stores
  const allStores = await prisma.store.findMany({
    where: { company_id: tdb.id },
    orderBy: { id: 'asc' } // Preserve the original oldest ones mostly
  });

  console.log(`Found ${allStores.length} total TDB stores.`);

  // We want to keep exactly 55 stores.
  // We MUST keep Carlos's specific stores: Tampa, Memphis, Louisville, Lexington
  const mustKeepNames = ['Tampa', 'Memphis', 'Louis', 'Lexing', 'Dallas']; // Add Dallas as the HQ/primary reference
  
  // Identify the stores to KEEP and to DELETE
  const storesToKeep = [];
  const storesToDelete = [];

  // First pass: Force keep the mandatory ones
  for (const store of allStores) {
    let mandatory = false;
    for (const name of mustKeepNames) {
      if (store.store_name.includes(name) || store.location.includes(name)) {
        mandatory = true;
        break;
      }
    }
    
    if (mandatory) {
      storesToKeep.push(store);
    }
  }

  // Second pass: Fill the rest until we reach 55
  for (const store of allStores) {
    if (storesToKeep.length >= 55) break;
    
    // If not already in the keep list
    if (!storesToKeep.find(s => s.id === store.id)) {
      storesToKeep.push(store);
    }
  }

  // Third pass: The rest go to the delete block
  for (const store of allStores) {
    if (!storesToKeep.find(s => s.id === store.id)) {
      storesToDelete.push(store);
    }
  }

  console.log(`Target: Keeping ${storesToKeep.length} stores. Deleting ${storesToDelete.length} stores.`);

  // 3. Delete excess stores and their relationships
  if (storesToDelete.length > 0) {
    const idsToDelete = storesToDelete.map(s => s.id);
    console.log(`Deleting ${idsToDelete.length} stores...`);
    
    // Prune cascading relationships manually if needed, otherwise rely on Prisma cascade
    await prisma.orderItem.deleteMany({ where: { order: { store_id: { in: idsToDelete } } } });
    await prisma.order.deleteMany({ where: { store_id: { in: idsToDelete } } });
    await prisma.inventoryRecord.deleteMany({ where: { store_id: { in: idsToDelete } } });
    await prisma.purchaseRecord.deleteMany({ where: { store_id: { in: idsToDelete } } });
    await prisma.report.deleteMany({ where: { store_id: { in: idsToDelete } } });
    await prisma.wasteLog.deleteMany({ where: { store_id: { in: idsToDelete } } });
    await prisma.wasteCompliance.deleteMany({ where: { store_id: { in: idsToDelete } } });
    await prisma.prepLog.deleteMany({ where: { store_id: { in: idsToDelete } } });
    await prisma.storeMeatTarget.deleteMany({ where: { store_id: { in: idsToDelete } } });
    
    // Unlink users from these stores
    await prisma.user.updateMany({
      where: { store_id: { in: idsToDelete } },
      data: { store_id: null }
    });

    // Delete the stores
    const deleteResult = await prisma.store.deleteMany({
      where: { id: { in: idsToDelete } }
    });
    console.log(`Deleted ${deleteResult.count} store records.`);
  }

  // 4. Reset Carlos's scope explicitly
  const carlos = await prisma.user.findFirst({
    where: { email: 'carlosrestrepo@texasdebrazil.com' }
  });

  if (carlos) {
    console.log(`\nReassigning Carlos Restrepo (${carlos.id}) to exact scope...`);
    
    // Detach Carlos from EVERYTHING first
    await prisma.store.updateMany({
      where: { area_manager_id: carlos.id },
      data: { area_manager_id: null }
    });

    // Reattach ONLY to Tampa, Memphis, Louisville, Lexington
    for (const name of ['Tampa', 'Memphis', 'Louis', 'Lexing']) {
      const targetStore = storesToKeep.find(s => s.store_name.includes(name) || s.location.includes(name));
      if (targetStore) {
        await prisma.store.update({
          where: { id: targetStore.id },
          data: { area_manager_id: carlos.id }
        });
        console.log(`✅ Attached Carlos to ${targetStore.store_name}`);
      } else {
        console.log(`⚠️ Warning: Could not find store matching '${name}'`);
      }
    }
  }

  console.log('\nAudit and correction complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
