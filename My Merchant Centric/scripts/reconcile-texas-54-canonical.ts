import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2 && parts[0].trim()) {
    process.env[parts[0].trim()] = parts.slice(1).join('=').replace(/"/g, '').trim();
  }
});

import { db } from '../src/lib/db';

export const AUTHORITATIVE_54_MEAT_IDS = [
  '20', '30', '40', '50', '60', '70', '79', '80', '90', '100',
  '110', '120', '140', '150', '160', '170', '180', '190', '210', '230',
  '240', '250', '260', '270', '290', '300', '310', '350', '360', '390',
  '400', '430', '440', '450', '460', '500', '510', '520', '530', '540',
  '550', '560', '610', '620', '630', '690', '700', '710', '760', '770',
  '800', '901', '902', '903'
];

async function reconcile() {
  console.log('========================================================================');
  console.log('   RUNNING PHASE 7B-5T-R — TEXAS 54-STORE CANONICAL RECONCILIATION');
  console.log('========================================================================\n');

  const tdbOrg = await db.organization.findFirst({ where: { brasaOrganizationId: 'tdb-main' } });
  if (!tdbOrg) throw new Error('Texas organization tdb-main not found');

  const allLocs = await db.location.findMany({ where: { organizationId: tdbOrg.id } });

  // 1. Audit and remove out-of-authority brasaLocationId mappings
  let correctedCount = 0;
  for (const loc of allLocs) {
    if (loc.brasaLocationId && !AUTHORITATIVE_54_MEAT_IDS.includes(loc.brasaLocationId)) {
      console.log(`[CORRECTING OUT-OF-AUTHORITY ID] ${loc.name}: clearing brasaLocationId "${loc.brasaLocationId}" -> null`);
      await db.location.update({
        where: { id: loc.id },
        data: {
          brasaLocationId: null,
          verificationStatus: 'PULSE_DIRECTORY_ONLY'
        }
      });
      correctedCount++;
    } else if (loc.brasaLocationId && AUTHORITATIVE_54_MEAT_IDS.includes(loc.brasaLocationId)) {
      // Ensure verified master operational status for valid authoritative IDs
      const isInternationalOrCS = loc.country !== 'USA' && loc.country !== 'US' && loc.country !== 'Puerto Rico' || loc.businessStatus === 'COMING_SOON';
      await db.location.update({
        where: { id: loc.id },
        data: {
          verificationStatus: isInternationalOrCS ? 'PULSE_DIRECTORY_ONLY' : 'MASTER_OPERATIONAL'
        }
      });
    } else {
      await db.location.update({
        where: { id: loc.id },
        data: {
          verificationStatus: 'PULSE_DIRECTORY_ONLY'
        }
      });
    }
  }

  // 2. Audit post-correction state
  const updatedLocs = await db.location.findMany({ where: { organizationId: tdbOrg.id } });
  const validMasterLocs = updatedLocs.filter(l => l.brasaLocationId && AUTHORITATIVE_54_MEAT_IDS.includes(l.brasaLocationId) && l.verificationStatus === 'MASTER_OPERATIONAL');
  const outOfAuthorityLocs = updatedLocs.filter(l => l.brasaLocationId && !AUTHORITATIVE_54_MEAT_IDS.includes(l.brasaLocationId));
  const dirOnlyLocs = updatedLocs.filter(l => l.verificationStatus === 'PULSE_DIRECTORY_ONLY');

  console.log(`\nReconciliation Audit Summary:`);
  console.log(`• Out-of-Authority IDs Corrected: ${correctedCount}`);
  console.log(`• Total Directory Records Preserved: ${updatedLocs.length} (Expected: 62)`);
  console.log(`• MASTER_OPERATIONAL Locations: ${validMasterLocs.length}`);
  console.log(`• PULSE_DIRECTORY_ONLY Locations: ${dirOnlyLocs.length}`);
  console.log(`• Out-of-Authority Mapped Count: ${outOfAuthorityLocs.length} (Expected: 0)`);
  console.log(`• Tampa UUID Preserved: ${updatedLocs.some(l => l.id === '87465c11-ec18-4a26-85d0-99ec0d29e912' && l.brasaLocationId === '20')}`);

  if (outOfAuthorityLocs.length > 0) {
    throw new Error('Canonical remapping audit failed: Out-of-authority IDs still remain!');
  }

  console.log('\n✔ TEXAS CANONICAL MAPPING RECONCILIATION COMPLETED SUCCESSFULLY 100%!');
}

reconcile().catch(console.error).finally(() => process.exit(0));
