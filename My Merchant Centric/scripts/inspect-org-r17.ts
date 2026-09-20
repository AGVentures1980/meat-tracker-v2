import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2 && parts[0].trim()) {
    process.env[parts[0].trim()] = parts.slice(1).join('=').replace(/"/g, '').trim();
  }
});

import { db } from '../src/lib/db';

async function inspectOrgs() {
  console.log('========================================================================');
  console.log('   INSPECTING BRAND PULSE ORGANIZATIONS — PHASE 7B-5U-R17');
  console.log('========================================================================\n');

  const orgs = await db.organization.findMany({
    include: {
      _count: {
        select: { locations: true }
      }
    }
  });

  console.log(`Total Organizations in Pulse DB: ${orgs.length}\n`);

  orgs.forEach((o, index) => {
    console.log(`[Org ${index + 1}]`);
    console.log(`  • Internal UUID: ${o.id}`);
    console.log(`  • Name: "${o.name}"`);
    console.log(`  • Slug: "${o.slug}"`);
    console.log(`  • brasaOrganizationId: "${o.brasaOrganizationId || 'NULL'}"`);
    console.log(`  • Location Count: ${o._count.locations}`);
    console.log('------------------------------------------------------------------------');
  });
}

inspectOrgs().catch(err => {
  console.error('Inspection failed:', err);
  process.exit(1);
});
