import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2 && parts[0].trim()) {
    process.env[parts[0].trim()] = parts.slice(1).join('=').replace(/"/g, '').trim();
  }
});

import { db } from '../src/lib/db';

async function executePhase7B5JCorrection() {
  console.log('========================================================================');
  console.log('   PHASE 7B-5J-R — CRITICAL BRASA MASTER IDENTITY CORRECTION');
  console.log('========================================================================\n');

  // 1. AUDIT BEFORE CORRECTION
  console.log('1. AUDIT PREVIOUSLY PERSISTED IDENTITIES:');
  const orgsBefore = await db.organization.findMany();
  orgsBefore.forEach(o => console.log(`   • Org: ${o.name.padEnd(35)} | ID: ${o.id} | brasaOrganizationId: ${o.brasaOrganizationId}`));

  const locsBefore = await db.location.findMany();
  const synthLocs = locsBefore.filter(l => l.brasaLocationId?.startsWith('store_'));
  console.log(`   • Total Pulse Locations: ${locsBefore.length}`);
  console.log(`   • Locations with Synthetic 'store_*' IDs: ${synthLocs.length}\n`);

  // Classification
  console.log('2. IDENTITY FAILURE CLASSIFICATION:');
  console.log('   • Organization Identity: CANONICAL_MASTER_IDENTITY_CORRUPTION (Substitute org IDs were persisted)');
  console.log('   • Location Identity: CANONICAL_MASTER_IDENTITY_CORRUPTION (Synthetic store_* IDs were persisted)\n');

  // 3. CORRECT TEXAS DE BRAZIL ORGANIZATION ID
  console.log('3. CORRECTING TEXAS DE BRAZIL MASTER ORGANIZATION ID:');
  const tdbOrg = orgsBefore.find(o => o.slug === 'demo-group' || o.brasaOrganizationId === 'org_demo_steakhouse');
  if (tdbOrg) {
    await db.organization.update({
      where: { id: tdbOrg.id },
      data: { brasaOrganizationId: 'tdb-main' }
    });
    console.log(`   ✔ Updated Texas de Brazil Org (${tdbOrg.id}) -> brasaOrganizationId: 'tdb-main'`);
  }

  // 4. CORRECT TERRA GAÚCHA ORGANIZATION & STORE IDs
  console.log('\n4. CORRECTING TERRA GAÚCHA MASTER IDENTITIES:');
  const tgOrg = orgsBefore.find(o => o.slug === 'terra-gaucha' || o.brasaOrganizationId === 'org_terra_gaucha');
  if (tgOrg) {
    await db.organization.update({
      where: { id: tgOrg.id },
      data: { brasaOrganizationId: '26e29999-5e6e-4022-bd85-17aec722655e' }
    });
    console.log(`   ✔ Updated Terra Gaúcha Org (${tgOrg.id}) -> brasaOrganizationId: '26e29999-5e6e-4022-bd85-17aec722655e'`);

    const tgLocs = await db.location.findMany({ where: { organizationId: tgOrg.id }, orderBy: { name: 'asc' } });
    const tgAuthoritativeMap = [
      { name: 'Terra Gaúcha - Jacksonville', brasaLocationId: '2', city: 'Jacksonville', state: 'FL' },
      { name: 'Terra Gaúcha - Tampa', brasaLocationId: '3', city: 'Tampa', state: 'FL' },
      { name: 'Terra Gaúcha - Stamford', brasaLocationId: '4', city: 'Stamford', state: 'CT' },
      { name: 'Terra Gaúcha - Indianapolis', brasaLocationId: '5', city: 'Indianapolis', state: 'IN' },
      { name: 'Terra Gaúcha - Omaha', brasaLocationId: '6', city: 'Omaha', state: 'NE' },
      { name: 'Terra Gaúcha - Rockville', brasaLocationId: '7', city: 'Rockville', state: 'MD' },
      { name: 'Terra Gaúcha - Orlando', brasaLocationId: '8', city: 'Orlando', state: 'FL' }
    ];

    for (let i = 0; i < tgLocs.length; i++) {
      const loc = tgLocs[i];
      const auth = tgAuthoritativeMap[i];
      await db.location.update({
        where: { id: loc.id },
        data: {
          name: auth.name,
          brasaLocationId: auth.brasaLocationId,
          city: auth.city,
          state: auth.state
        }
      });
      console.log(`   ✔ Updated Terra Gaúcha Store: ${auth.name} (UUID: ${loc.id}) -> brasaLocationId: '${auth.brasaLocationId}'`);
    }
  }

  // 5. CORRECT HARD ROCK ORGANIZATION & STORE IDs
  console.log('\n5. CORRECTING HARD ROCK HOTEL & CASINO MASTER IDENTITIES:');
  const hrOrg = orgsBefore.find(o => o.slug === 'hard-rock' || o.brasaOrganizationId === 'org_hard_rock');
  if (hrOrg) {
    await db.organization.update({
      where: { id: hrOrg.id },
      data: { brasaOrganizationId: 'ea32ec07-c64b-4670-88ec-849cabd7170f' }
    });
    console.log(`   ✔ Updated Hard Rock Org (${hrOrg.id}) -> brasaOrganizationId: 'ea32ec07-c64b-4670-88ec-849cabd7170f'`);

    const hrLocs = await db.location.findMany({ where: { organizationId: hrOrg.id }, orderBy: { name: 'asc' } });
    const hrAuthoritativeMap = [
      { name: 'Hard Rock Hotel & Casino - Tampa', brasaLocationId: '9', city: 'Tampa', state: 'FL' },
      { name: 'Hard Rock Hotel & Casino - Hollywood', brasaLocationId: '10', city: 'Hollywood', state: 'FL' },
      { name: 'Hard Rock Hotel & Casino - Punta Cana', brasaLocationId: '11', city: 'Punta Cana', state: 'Dominican Republic' },
      { name: 'Hard Rock Hotel & Casino - Atlantic City', brasaLocationId: '1205', city: 'Atlantic City', state: 'NJ' }
    ];

    for (let i = 0; i < hrLocs.length; i++) {
      const loc = hrLocs[i];
      const auth = hrAuthoritativeMap[i];
      await db.location.update({
        where: { id: loc.id },
        data: {
          name: auth.name,
          brasaLocationId: auth.brasaLocationId,
          city: auth.city,
          state: auth.state
        }
      });
      console.log(`   ✔ Updated Hard Rock Store: ${auth.name} (UUID: ${loc.id}) -> brasaLocationId: '${auth.brasaLocationId}'`);
    }
  }

  // 6. CORRECT BLOOMIN' / OUTBACK ORGANIZATION & STORE IDs
  console.log("\n6. CORRECTING BLOOMIN' BRANDS / OUTBACK MASTER IDENTITIES:");
  const obOrg = orgsBefore.find(o => o.slug === 'bloomin-outback' || o.brasaOrganizationId === 'org_outback');
  if (obOrg) {
    await db.organization.update({
      where: { id: obOrg.id },
      data: { brasaOrganizationId: 'd04d5015-44a9-4bdd-9021-b8bd28caad9b' }
    });
    console.log(`   ✔ Updated Outback Org (${obOrg.id}) -> brasaOrganizationId: 'd04d5015-44a9-4bdd-9021-b8bd28caad9b'`);

    const obLocs = await db.location.findMany({ where: { organizationId: obOrg.id }, orderBy: { name: 'asc' } });
    const obAuthoritativeMap = [
      { name: 'Outback Steakhouse - Dallas Pilot', brasaLocationId: '1', city: 'Dallas', state: 'TX' },
      { name: 'Outback Steakhouse - Tampa', brasaLocationId: '12', city: 'Tampa', state: 'FL' },
      { name: 'Outback Steakhouse - Houston', brasaLocationId: '13', city: 'Houston', state: 'TX' },
      { name: 'Outback Steakhouse - NYC', brasaLocationId: '14', city: 'New York', state: 'NY' }
    ];

    for (let i = 0; i < obLocs.length; i++) {
      const loc = obLocs[i];
      const auth = obAuthoritativeMap[i];
      await db.location.update({
        where: { id: loc.id },
        data: {
          name: auth.name,
          brasaLocationId: auth.brasaLocationId,
          city: auth.city,
          state: auth.state
        }
      });
      console.log(`   ✔ Updated Outback Store: ${auth.name} (UUID: ${loc.id}) -> brasaLocationId: '${auth.brasaLocationId}'`);
    }
  }

  console.log('\n=== MASTER IDENTITY CORRECTION EXECUTED SUCCESSFULLY ===');
}

executePhase7B5JCorrection().catch(console.error);
