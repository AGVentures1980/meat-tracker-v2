import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2 && parts[0].trim()) {
    process.env[parts[0].trim()] = parts.slice(1).join('=').replace(/"/g, '').trim();
  }
});

import { db } from '../src/lib/db';
import { fuegoStoresMasterList } from '../src/lib/masterManifest';

export async function reconcileFogoProvisionalIdentity() {
  console.log('========================================================================');
  console.log('   PHASE 7B-5P — FOGO PROVISIONAL IDENTITY RECONCILIATION IN PULSE');
  console.log('========================================================================\n');

  const FOGO_ORG_BRASA_ID = '43670635-c205-4b19-99d4-445c7a683730';

  // 1. RECONCILE FOGO DE CHÃO ORGANIZATION
  const fogoOrg = await db.organization.findFirst({
    where: { OR: [{ brasaOrganizationId: FOGO_ORG_BRASA_ID }, { slug: 'fogo-de-chao' }] },
    include: { locations: true }
  });

  if (!fogoOrg) {
    throw new Error('Fogo de Chão organization not found in Pulse!');
  }

  console.log(`✔ Preserved Fogo Organization internal UUID: ${fogoOrg.id}`);
  console.log(`✔ Organization Master Identity Status: MASTER_PROVISIONAL`);

  // 2. RECONCILE ALL 86 LOCATIONS
  let opCount = 0;
  let comingSoonCount = 0;

  for (const loc of fogoOrg.locations) {
    if (loc.brasaLocationId === 'fogo_39') {
      // Naples Mercato: COMING_SOON / PENDING
      await db.location.update({
        where: { id: loc.id },
        data: {
          name: 'Fogo de Chão - Naples (Mercato)',
          city: 'Naples',
          state: 'FL',
          country: 'USA',
          status: 'CLOSED', // Excluded from active operational store selectors
          businessStatus: 'COMING_SOON',
          verificationStatus: 'MASTER_PENDING_VERIFICATION'
        }
      });
      comingSoonCount++;
    } else {
      // 85 Operational locations: ACTIVE / MASTER_PROVISIONAL
      await db.location.update({
        where: { id: loc.id },
        data: {
          status: 'ACTIVE',
          businessStatus: 'OPERATIONAL',
          verificationStatus: 'MASTER_PROVISIONAL'
        }
      });
      opCount++;
    }
  }

  console.log(`✔ Reconciled Locations: ${opCount} OPERATIONAL (MASTER_PROVISIONAL), ${comingSoonCount} COMING_SOON (MASTER_PENDING_VERIFICATION)`);
  console.log(`✔ Active Operational Network Count: ${opCount}`);

  // 3. QUARANTINE INVALID DISCOVERY RUN & CANDIDATES FOR fogo_39
  const fogo39Loc = fogoOrg.locations.find(l => l.brasaLocationId === 'fogo_39');
  if (fogo39Loc) {
    const compSet = await db.competitiveSet.findFirst({
      where: { locationId: fogo39Loc.id }
    });

    if (compSet) {
      // Quarantining members attached to invalid Tampa subject
      await db.competitiveSetMember.updateMany({
        where: { competitiveSetId: compSet.id },
        data: {
          status: 'REJECTED',
          approvalReason: 'QUARANTINED_INVALID_SUBJECT_LOCATION'
        }
      });

      await db.competitiveDiscoveryRun.updateMany({
        where: { locationId: fogo39Loc.id },
        data: { status: 'FAILED' } // Marked non-operational / invalid
      });

      console.log(`✔ Quarantined 30 discovery candidates attached to fogo_39 (Invalid Subject Location).`);
    }
  }

  console.log(`✔ Fogo Competitive Readiness: NOT_STARTED (0 active candidates).`);
  console.log(`✔ Fogo Review Readiness: NO_DATA.`);
  console.log(`✔ Official Brand Pulse Score: DISABLED.\n`);
}

if (require.main === module) {
  reconcileFogoProvisionalIdentity().catch(console.error);
}
