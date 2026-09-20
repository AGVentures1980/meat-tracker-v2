import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2 && parts[0].trim()) {
    process.env[parts[0].trim()] = parts.slice(1).join('=').replace(/"/g, '').trim();
  }
});

import { db } from '../src/lib/db';

const MASTER_STORE_MAPPINGS: Record<string, string> = {
  'Texas de Brazil - Birmingham': '220',
  'Texas de Brazil - Huntsville': '225',
  'Texas de Brazil - Fresno': '750',
  'Texas de Brazil - Rancho Cucamonga': '740',
  'Texas de Brazil - Colorado Springs': '165',
  'Texas de Brazil - Palm Beach Gardens': '904',
  'Texas de Brazil - Orland Park': '205',
};

const DIRECTORY_ONLY_NAMES = [
  'Texas de Brazil - Rogers',
  'Texas de Brazil - Tyler',
  'Texas de Brazil - Woodmere',
  'Texas de Brazil - Westminster',
  'Texas de Brazil - Panama City',
  'Texas de Brazil - Port of Spain',
  'Texas de Brazil - Seoul (Apgujeong)',
  'Texas de Brazil - Seoul (Central City)',
];

async function reconcile() {
  console.log('========================================================================');
  console.log('   RECONCILING TEXAS DE BRAZIL MASTER MANIFEST & DIRECTORY CLASSIFICATION');
  console.log('========================================================================\n');

  const tdbOrg = await db.organization.findFirst({ where: { brasaOrganizationId: 'tdb-main' } });
  if (!tdbOrg) throw new Error('Texas organization tdb-main not found');

  // 1. Update the 7 master domestic stores with their Meat master brasaLocationId & MASTER_OPERATIONAL status
  for (const [name, brasaLocId] of Object.entries(MASTER_STORE_MAPPINGS)) {
    const loc = await db.location.findFirst({ where: { organizationId: tdbOrg.id, name } });
    if (loc) {
      await db.location.update({
        where: { id: loc.id },
        data: {
          brasaLocationId: brasaLocId,
          verificationStatus: 'MASTER_OPERATIONAL',
          businessStatus: 'OPERATIONAL',
          status: 'ACTIVE'
        }
      });
      console.log(`✔ Linked master store: ${name} -> brasaLocationId = ${brasaLocId}`);
    }
  }

  // 2. Ensure all 54 master operational stores have verificationStatus = MASTER_OPERATIONAL
  const allTdbLocs = await db.location.findMany({ where: { organizationId: tdbOrg.id } });

  for (const loc of allTdbLocs) {
    if (DIRECTORY_ONLY_NAMES.includes(loc.name)) {
      await db.location.update({
        where: { id: loc.id },
        data: {
          verificationStatus: 'PULSE_DIRECTORY_ONLY'
        }
      });
    } else {
      await db.location.update({
        where: { id: loc.id },
        data: {
          verificationStatus: 'MASTER_OPERATIONAL',
          businessStatus: 'OPERATIONAL',
          status: 'ACTIVE'
        }
      });
    }
  }

  // 3. Verify counts
  const finalLocs = await db.location.findMany({ where: { organizationId: tdbOrg.id } });
  const masterOps = finalLocs.filter(l => l.verificationStatus === 'MASTER_OPERATIONAL');
  const dirOnly = finalLocs.filter(l => l.verificationStatus === 'PULSE_DIRECTORY_ONLY');

  console.log(`\nReconciliation Results:`);
  console.log(`• Total Directory Records in DB: ${finalLocs.length} (Expected: 62)`);
  console.log(`• MASTER_OPERATIONAL Locations: ${masterOps.length} (Expected: 54)`);
  console.log(`• PULSE_DIRECTORY_ONLY Locations: ${dirOnly.length} (Expected: 8)`);
  console.log(`• Tampa UUID Preserved: ${finalLocs.some(l => l.id === '87465c11-ec18-4a26-85d0-99ec0d29e912' && l.brasaLocationId === '20')}`);

  if (finalLocs.length !== 62 || masterOps.length !== 54 || dirOnly.length !== 8) {
    throw new Error('Reconciliation count verification failed!');
  }

  console.log('\n✔ TEXAS DE BRAZIL DIRECTORY RECONCILIATION COMPLETED SUCCESSFULLY 100%!');
}

reconcile().catch(console.error).finally(() => process.exit(0));
