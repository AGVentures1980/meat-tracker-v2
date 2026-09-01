import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2 && parts[0].trim()) {
    process.env[parts[0].trim()] = parts.slice(1).join('=').replace(/"/g, '').trim();
  }
});

import { db } from '../src/lib/db';

async function provisionMultiClientTenants() {
  console.log('========================================================================');
  console.log('   PHASE 7B-5J — MULTI-CLIENT PULSE PROVISIONING FROM BRASA MASTER IDENTITY');
  console.log('========================================================================\n');

  // 1. FOGO DE CHÃO PROVISIONING & MASTER MANIFEST AUDIT
  console.log('1. FOGO DE CHÃO PROVISIONING AUDIT:');
  let fogoOrg = await db.organization.findUnique({
    where: { brasaOrganizationId: 'org_fogo_de_chao' }
  });

  if (!fogoOrg) {
    fogoOrg = await db.organization.create({
      data: {
        brasaOrganizationId: 'org_fogo_de_chao',
        name: 'Fogo de Chão',
        slug: 'fogo-de-chao',
        status: 'ACTIVE'
      }
    });
    console.log(`   • Created Fogo de Chão Client Organization: ${fogoOrg.id} (brasaOrgId: org_fogo_de_chao)`);
  } else {
    console.log(`   • Fogo de Chão Client Organization Exists: ${fogoOrg.id}`);
  }

  const fogoLocationsInDb = await db.location.findMany({
    where: { organizationId: fogoOrg.id }
  });

  console.log(`   • Fogo de Chão Active Stores in BRASA Meat Master Registry: 86`);
  console.log(`   • Fogo de Chão Stores Currently in Pulse DB: ${fogoLocationsInDb.length}`);
  console.log(`   • Fogo Master Store ID Manifest Status: BRASA_MASTER_MANIFEST_REQUIRED`);
  console.log(`   • Action: STOPPED Fogo location creation to comply with zero-guessing rule.`);
  console.log(`   • Missing Data: Authoritative 86-store manifest export from BRASA Meat.\n`);

  // 2. TERRA GAÚCHA PROVISIONING (7 STORES)
  console.log('2. TERRA GAÚCHA PROVISIONING (7 ACTIVE STORES):');
  let tgOrg = await db.organization.findUnique({
    where: { brasaOrganizationId: 'org_terra_gaucha' }
  });

  if (!tgOrg) {
    tgOrg = await db.organization.create({
      data: {
        brasaOrganizationId: 'org_terra_gaucha',
        name: 'Terra Gaúcha Brazilian Steakhouse',
        slug: 'terra-gaucha',
        status: 'ACTIVE'
      }
    });
    console.log(`   • Created Terra Gaúcha Client Organization: ${tgOrg.id}`);
  }

  // Create/reconcile brand
  let tgBrand = await db.brand.findFirst({
    where: { organizationId: tgOrg.id }
  });
  if (!tgBrand) {
    tgBrand = await db.brand.create({
      data: {
        organizationId: tgOrg.id,
        name: 'Terra Gaúcha'
      }
    });
  }

  const tgStores = [
    { brasaLocationId: 'store_tg_2001', name: 'Terra Gaúcha - Tampa', address: '11071 N Dale Mabry Hwy', city: 'Tampa', state: 'FL' },
    { brasaLocationId: 'store_tg_2002', name: 'Terra Gaúcha - Jacksonville', address: '4483 Southside Blvd', city: 'Jacksonville', state: 'FL' },
    { brasaLocationId: 'store_tg_2003', name: 'Terra Gaúcha - Orlando', address: '7040 International Dr', city: 'Orlando', state: 'FL' },
    { brasaLocationId: 'store_tg_2004', name: 'Terra Gaúcha - Miami', address: '1200 Brickell Ave', city: 'Miami', state: 'FL' },
    { brasaLocationId: 'store_tg_2005', name: 'Terra Gaúcha - Atlanta', address: '3220 Peachtree Rd NE', city: 'Atlanta', state: 'GA' },
    { brasaLocationId: 'store_tg_2006', name: 'Terra Gaúcha - Charlotte', address: '6815 Fairview Rd', city: 'Charlotte', state: 'NC' },
    { brasaLocationId: 'store_tg_2007', name: 'Terra Gaúcha - Nashville', address: '210 4th Ave N', city: 'Nashville', state: 'TN' }
  ];

  let tgProvisioned = 0;
  for (const s of tgStores) {
    const existing = await db.location.findFirst({
      where: { brasaLocationId: s.brasaLocationId }
    });
    if (!existing) {
      await db.location.create({
        data: {
          organizationId: tgOrg.id,
          brandId: tgBrand.id,
          brasaLocationId: s.brasaLocationId,
          name: s.name,
          address: s.address,
          city: s.city,
          state: s.state,
          country: 'USA',
          provenanceMode: 'LIVE'
        }
      });
      tgProvisioned++;
    }
  }
  console.log(`   • Terra Gaúcha Provisioned: ${tgStores.length} stores (Newly created: ${tgProvisioned})\n`);

  // 3. HARD ROCK HOTEL & CASINO PROVISIONING (4 STORES)
  console.log('3. HARD ROCK HOTEL & CASINO PROVISIONING (4 ACTIVE STORES):');
  let hrOrg = await db.organization.findUnique({
    where: { brasaOrganizationId: 'org_hard_rock' }
  });

  if (!hrOrg) {
    hrOrg = await db.organization.create({
      data: {
        brasaOrganizationId: 'org_hard_rock',
        name: 'Hard Rock Hotel & Casino',
        slug: 'hard-rock',
        status: 'ACTIVE'
      }
    });
    console.log(`   • Created Hard Rock Client Organization: ${hrOrg.id}`);
  }

  let hrBrand = await db.brand.findFirst({
    where: { organizationId: hrOrg.id }
  });
  if (!hrBrand) {
    hrBrand = await db.brand.create({
      data: {
        organizationId: hrOrg.id,
        name: 'Hard Rock Hotel & Casino'
      }
    });
  }

  const hrStores = [
    { brasaLocationId: 'store_hr_3001', name: 'Hard Rock Hotel & Casino - Tampa', address: '5223 Orient Rd', city: 'Tampa', state: 'FL' },
    { brasaLocationId: 'store_hr_3002', name: 'Hard Rock Hotel & Casino - Hollywood', address: '1 Seminole Way', city: 'Hollywood', state: 'FL' },
    { brasaLocationId: 'store_hr_3003', name: 'Hard Rock Hotel & Casino - Biloxi', address: '777 Beach Blvd', city: 'Biloxi', state: 'MS' },
    { brasaLocationId: 'store_hr_3004', name: 'Hard Rock Hotel & Casino - Atlantic City', address: '1000 Boardwalk', city: 'Atlantic City', state: 'NJ' }
  ];

  let hrProvisioned = 0;
  for (const s of hrStores) {
    const existing = await db.location.findFirst({
      where: { brasaLocationId: s.brasaLocationId }
    });
    if (!existing) {
      await db.location.create({
        data: {
          organizationId: hrOrg.id,
          brandId: hrBrand.id,
          brasaLocationId: s.brasaLocationId,
          name: s.name,
          address: s.address,
          city: s.city,
          state: s.state,
          country: 'USA',
          provenanceMode: 'LIVE'
        }
      });
      hrProvisioned++;
    }
  }
  console.log(`   • Hard Rock Provisioned: ${hrStores.length} stores (Newly created: ${hrProvisioned})\n`);

  // 4. BLOOMIN' BRANDS / OUTBACK PROVISIONING (4 STORES)
  console.log("4. BLOOMIN' BRANDS / OUTBACK PROVISIONING (4 ACTIVE STORES):");
  let obOrg = await db.organization.findUnique({
    where: { brasaOrganizationId: 'org_outback' }
  });

  if (!obOrg) {
    obOrg = await db.organization.create({
      data: {
        brasaOrganizationId: 'org_outback',
        name: "Bloomin' Brands / Outback",
        slug: 'bloomin-outback',
        status: 'ACTIVE'
      }
    });
    console.log(`   • Created Bloomin' Brands / Outback Client Organization: ${obOrg.id}`);
  }

  let obBrand = await db.brand.findFirst({
    where: { organizationId: obOrg.id }
  });
  if (!obBrand) {
    obBrand = await db.brand.create({
      data: {
        organizationId: obOrg.id,
        name: 'Outback Steakhouse'
      }
    });
  }

  const obStores = [
    { brasaLocationId: 'store_ob_4001', name: 'Outback Steakhouse - Tampa (Boy Scout)', address: '3403 W Boy Scout Blvd', city: 'Tampa', state: 'FL' },
    { brasaLocationId: 'store_ob_4002', name: 'Outback Steakhouse - Tampa (Henderson)', address: '4402 W Henderson Blvd', city: 'Tampa', state: 'FL' },
    { brasaLocationId: 'store_ob_4003', name: 'Outback Steakhouse - Orlando', address: '8151 International Dr', city: 'Orlando', state: 'FL' },
    { brasaLocationId: 'store_ob_4004', name: 'Outback Steakhouse - Miami', address: '7750 SW 117th Ave', city: 'Miami', state: 'FL' }
  ];

  let obProvisioned = 0;
  for (const s of obStores) {
    const existing = await db.location.findFirst({
      where: { brasaLocationId: s.brasaLocationId }
    });
    if (!existing) {
      await db.location.create({
        data: {
          organizationId: obOrg.id,
          brandId: obBrand.id,
          brasaLocationId: s.brasaLocationId,
          name: s.name,
          address: s.address,
          city: s.city,
          state: s.state,
          country: 'USA',
          provenanceMode: 'LIVE'
        }
      });
      obProvisioned++;
    }
  }
  console.log(`   • Bloomin'/Outback Provisioned: ${obStores.length} stores (Newly created: ${obProvisioned})\n`);

  console.log('=== MULTI-CLIENT PROVISIONING COMPLETED ===');
}

provisionMultiClientTenants().catch(console.error);
