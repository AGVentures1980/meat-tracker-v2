import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2 && parts[0].trim()) {
    process.env[parts[0].trim()] = parts.slice(1).join('=').replace(/"/g, '').trim();
  }
});

import { db } from '../src/lib/db';

async function auditMasterIdentityRecords() {
  console.log('========================================================================');
  console.log('   AUDITING PULSE DATABASE LOCATION MASTER IDENTITIES');
  console.log('========================================================================\n');

  const locs = await db.location.findMany({
    include: { organization: true },
    orderBy: { name: 'asc' }
  });

  console.log(`Total Locations in Pulse DB: ${locs.length}\n`);

  const targets = [
    'Terra Gaucha',
    'Hard Rock',
    'Outback',
    'Fogo de Chão',
    'Texas de Brazil'
  ];

  for (const t of targets) {
    const matched = locs.filter(l => l.name.includes(t) || l.organization.name.includes(t));
    console.log(`--- ${t.toUpperCase()} LOCATIONS (${matched.length}) ---`);
    matched.slice(0, 15).forEach(l => {
      console.log(` • ID: ${l.id} | Name: "${l.name}" | Org: "${l.organization.name}" (${l.organization.brasaOrganizationId}) | brasaLocationId: ${l.brasaLocationId} | City: ${l.city}, ${l.state}`);
    });
    if (matched.length > 15) console.log(`   ... plus ${matched.length - 15} more locations`);
    console.log('');
  }
}

auditMasterIdentityRecords().catch(console.error);
