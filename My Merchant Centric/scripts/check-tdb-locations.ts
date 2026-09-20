import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2 && parts[0].trim()) {
    process.env[parts[0].trim()] = parts.slice(1).join('=').replace(/"/g, '').trim();
  }
});

import { db } from '../src/lib/db';

async function checkTdbLocations() {
  const org = await db.organization.findFirst({ where: { brasaOrganizationId: 'tdb-main' } });
  if (!org) {
    console.log('Org tdb-main not found!');
    return;
  }

  const locs = await db.location.findMany({
    where: { organizationId: org.id },
    select: { id: true, name: true, brasaLocationId: true }
  });

  console.log(`Found ${locs.length} locations for Texas de Brazil:`);
  locs.forEach(l => {
    console.log(` - ID: ${l.id} | Name: ${l.name} | brasaLocationId: ${l.brasaLocationId}`);
  });
}

checkTdbLocations().catch(console.error);
