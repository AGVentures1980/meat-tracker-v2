import fs from 'fs';
import path from 'path';

const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2 && parts[0].trim()) {
    process.env[parts[0].trim()] = parts.slice(1).join('=').replace(/"/g, '').trim();
  }
});

import { db } from '../src/lib/db';

async function checkManifests() {
  console.log('=== CHECKING FOR BRASA MEAT MASTER MANIFESTS ===');

  // Check database organizations
  const orgs = await db.organization.findMany();
  console.log('Existing Organizations in DB:');
  orgs.forEach(o => console.log(` - ${o.name} | id: ${o.id} | brasaOrgId: ${o.brasaOrganizationId}`));

  // Check database locations
  const locs = await db.location.findMany();
  console.log(`\nTotal Locations in DB: ${locs.length}`);

  // Check for Fogo, Terra Gaucha, Hard Rock, Outback locations in DB
  const fogoLocs = locs.filter(l => l.name.toLowerCase().includes('fogo'));
  const terraLocs = locs.filter(l => l.name.toLowerCase().includes('terra'));
  const hardRockLocs = locs.filter(l => l.name.toLowerCase().includes('hard rock'));
  const outbackLocs = locs.filter(l => l.name.toLowerCase().includes('outback'));

  console.log(`\nExisting DB Locations by Brand:`);
  console.log(` • Fogo de Chão: ${fogoLocs.length}`);
  console.log(` • Terra Gaúcha: ${terraLocs.length}`);
  console.log(` • Hard Rock: ${hardRockLocs.length}`);
  console.log(` • Outback: ${outbackLocs.length}`);

  // Check ExternalLocationIdentity mappings
  const extLocs = await db.externalLocationIdentity.findMany({ where: { provider: 'BRASA_MEAT' } });
  console.log(`\nTotal BRASA_MEAT ExternalLocationIdentity records in DB: ${extLocs.length}`);
}

checkManifests().catch(console.error);
