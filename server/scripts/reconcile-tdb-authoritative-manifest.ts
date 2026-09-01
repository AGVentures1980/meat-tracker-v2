import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTdbReconciliationAudit() {
  console.log('===============================================================');
  console.log('  PHASE 7B-5S — TEXAS DE BRAZIL AUTHORITATIVE MANIFEST AUDIT   ');
  console.log('===============================================================\n');

  // 1. Resolve Texas de Brazil Company in BRASA Meat DB
  const tdbCompany = await prisma.company.findFirst({
    where: {
      OR: [
        { id: 'tdb-main' },
        { subdomain: 'texasdebrazil' },
        { name: { contains: 'Texas de Brazil', mode: 'insensitive' } }
      ]
    },
    include: {
      stores: {
        orderBy: { id: 'asc' }
      }
    }
  });

  if (!tdbCompany) {
    console.error('CRITICAL: Texas de Brazil company not found in BRASA Meat database!');
    process.exit(1);
  }

  console.log('AUTHORITATIVE TEXAS ORGANIZATION:');
  console.log(`- Company Name: ${tdbCompany.name}`);
  console.log(`- Internal Meat Company ID: ${tdbCompany.id}`);
  console.log(`- Billing Status: ${tdbCompany.billing_status}`);
  console.log(`- Company Status: ${tdbCompany.company_status}`);
  console.log(`- Total Stores in Meat DB: ${tdbCompany.stores.length}\n`);

  // 2. Full Store Manifest & Reconcile Status Counts
  const stores = tdbCompany.stores;

  let activeCount = 0;
  let inactiveCount = 0;
  let usOperationalCount = 0;
  let puertoRicoCount = 0;
  let internationalOperationalCount = 0;
  let comingSoonCount = 0;
  let closedCount = 0;

  console.log('=== FULL MASTER LOCATION MANIFEST (BRASA MEAT) ===');
  stores.forEach(s => {
    const isStoreActive = s.status === 'ACTIVE' || s.billing_active === true;
    const countryStr = (s.country || 'USA').trim().toUpperCase();
    const isUS = countryStr === 'USA' || countryStr === 'US' || countryStr === 'UNITED STATES';
    const isPR = countryStr === 'PUERTO RICO' || countryStr === 'PR' || (s.location || '').toLowerCase().includes('puerto rico') || (s.city || '').toLowerCase().includes('san juan');
    const isComingSoon = (s.store_name || '').toLowerCase().includes('coming soon') || (s.location || '').toLowerCase().includes('coming soon');
    const isClosed = (s.store_name || '').toLowerCase().includes('closed') || (s.location || '').toLowerCase().includes('closed');

    if (isStoreActive) activeCount++; else inactiveCount++;

    if (isComingSoon) {
      comingSoonCount++;
    } else if (isClosed) {
      closedCount++;
    } else if (isPR) {
      puertoRicoCount++;
      if (isStoreActive) usOperationalCount++; // PR counted in US/territories
    } else if (isUS) {
      if (isStoreActive) usOperationalCount++;
    } else {
      if (isStoreActive) internationalOperationalCount++;
    }

    console.log(`[Store ID: ${s.id}] ${s.store_name} | Location: ${s.location} | City: ${s.city || 'N/A'} | Country: ${s.country} | Status: ${s.status} | Billing: ${s.billing_active ? 'ACTIVE' : 'INACTIVE'} | Type: ${s.data_type}`);
  });

  console.log('\n=== STATUS & GEOGRAPHIC RECONCILIATION SUMMARY ===');
  console.log(`Total Master Store Records: ${stores.length}`);
  console.log(`Authoritative Active/Operational Stores: ${activeCount}`);
  console.log(`- US Operational Stores: ${usOperationalCount}`);
  console.log(`- Puerto Rico Stores: ${puertoRicoCount}`);
  console.log(`- International Operational Stores: ${internationalOperationalCount}`);
  console.log(`Coming Soon Stores: ${comingSoonCount}`);
  console.log(`Closed / Inactive Stores: ${inactiveCount}`);

  await prisma.$disconnect();
}

runTdbReconciliationAudit().catch(console.error);
