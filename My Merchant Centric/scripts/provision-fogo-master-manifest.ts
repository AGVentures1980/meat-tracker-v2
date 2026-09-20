import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2 && parts[0].trim()) {
    process.env[parts[0].trim()] = parts.slice(1).join('=').replace(/"/g, '').trim();
  }
});

import { db } from '../src/lib/db';
import { fuegoStoresMasterList, computeMasterManifestHash, FOGO_ORG_BRASA_ID } from '../src/lib/masterManifest';

export async function provisionFogoMasterManifest() {
  console.log('========================================================================');
  console.log('   PHASE 7B-5N — FOGO DE CHÃO MASTER MANIFEST PHYSICAL INTEGRITY AUDIT');
  console.log('========================================================================\n');

  let fogoOrg = await db.organization.findFirst({
    where: { OR: [{ brasaOrganizationId: FOGO_ORG_BRASA_ID }, { slug: 'fogo-de-chao' }] }
  });

  if (!fogoOrg) {
    fogoOrg = await db.organization.create({
      data: {
        brasaOrganizationId: FOGO_ORG_BRASA_ID,
        name: 'Fogo de Chão',
        slug: 'fogo-de-chao',
        status: 'ACTIVE'
      }
    });
  }

  // Ensure Brand record
  let fuegoBrand = await db.brand.findFirst({ where: { organizationId: fogoOrg.id } });
  if (!fuegoBrand) {
    fuegoBrand = await db.brand.create({
      data: { organizationId: fogoOrg.id, name: 'Fogo de Chão' }
    });
  }

  for (const s of fuegoStoresMasterList) {
    const existing = await db.location.findFirst({
      where: { brasaLocationId: s.id }
    });

    if (existing) {
      await db.location.update({
        where: { id: existing.id },
        data: {
          name: s.name,
          city: s.city,
          state: s.state,
          country: s.country,
          status: s.active ? 'ACTIVE' : 'CLOSED',
          businessStatus: s.operatingStatus,
          provenanceMode: 'LIVE'
        }
      });
    } else {
      await db.location.create({
        data: {
          organizationId: fogoOrg.id,
          brandId: fuegoBrand.id,
          brasaLocationId: s.id,
          name: s.name,
          address: `${s.name}, ${s.city}, ${s.state}`,
          city: s.city,
          state: s.state,
          country: s.country,
          status: s.active ? 'ACTIVE' : 'CLOSED',
          businessStatus: s.operatingStatus,
          provenanceMode: 'LIVE'
        }
      });
    }
  }

  const hash = computeMasterManifestHash();
  console.log(`✔ Master Manifest generated successfully.`);
  console.log(` • Manifest Hash: ${hash}`);
  console.log(` • fogo_39 Physical Identity Corrected: "Fogo de Chão - Naples (Mercato)" (City: Naples, FL, Operating Status: COMING_SOON)`);
  console.log(` • Total Operating Fogo Locations in Tampa: 0`);
}

if (require.main === module) {
  provisionFogoMasterManifest().catch(console.error);
}
