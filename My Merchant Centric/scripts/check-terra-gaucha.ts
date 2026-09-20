import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2 && parts[0].trim()) {
    process.env[parts[0].trim()] = parts.slice(1).join('=').replace(/"/g, '').trim();
  }
});

import { db } from '../src/lib/db';

async function checkTerraGaucha() {
  const org = await db.organization.findFirst({
    where: {
      OR: [
        { name: { contains: 'Terra' } },
        { brasaOrganizationId: '26e29999-5e6e-4022-bd85-17aec722655e' }
      ]
    },
    include: { locations: true }
  });

  if (!org) {
    console.log('Terra Gaúcha Organization not found in DB!');
    return;
  }

  console.log(`Org Name: "${org.name}" | ID: ${org.id} | brasaOrgId: ${org.brasaOrganizationId}`);
  console.log(`Locations count: ${org.locations.length}`);
  org.locations.forEach(l => {
    console.log(` • ID: ${l.id} | Name: "${l.name}" | brasaLocationId: ${l.brasaLocationId} | City: ${l.city}`);
  });
}

checkTerraGaucha().catch(console.error);
