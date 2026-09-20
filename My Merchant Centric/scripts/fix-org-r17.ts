import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2 && parts[0].trim()) {
    process.env[parts[0].trim()] = parts.slice(1).join('=').replace(/"/g, '').trim();
  }
});

import { db } from '../src/lib/db';

async function fixOrgMapping() {
  console.log('========================================================================');
  console.log('   UPDATING TEXAS DE BRAZIL ORG MAPPING — PHASE 7B-5U-R17');
  console.log('========================================================================\n');

  const meatOrgId = '9e371bc2-594f-46a3-8c95-8fc91a13041f';

  // 1. FIND EXISTING TEXAS DE BRAZIL PULSE ORG
  const texasOrg = await db.organization.findFirst({
    where: {
      OR: [
        { slug: 'texas-de-brazil' },
        { name: { contains: 'Texas de Brazil', mode: 'insensitive' } },
        { brasaOrganizationId: 'tdb-main' }
      ]
    }
  });

  if (!texasOrg) {
    console.log('❌ FAIL: PULSE_ORGANIZATION_MISSING');
    process.exit(1);
  }

  console.log(`Found Texas de Brazil Organization:`);
  console.log(`  • Internal Pulse UUID: ${texasOrg.id}`);
  console.log(`  • Name: ${texasOrg.name}`);
  console.log(`  • brasaOrganizationId BEFORE: "${texasOrg.brasaOrganizationId}"`);

  // 2. UPDATE BRASAORGANIZATIONID TO AUTHORITATIVE MEAT UUID
  const updatedOrg = await db.organization.update({
    where: { id: texasOrg.id },
    data: { brasaOrganizationId: meatOrgId }
  });

  console.log(`  • brasaOrganizationId AFTER: "${updatedOrg.brasaOrganizationId}"`);

  // 3. ALSO PERSIST TO EXTERNALORGANIZATIONIDENTITY FOR DUAL COMPATIBILITY
  await db.externalOrganizationIdentity.upsert({
    where: {
      provider_externalOrgId: {
        provider: 'BRASA_MEAT',
        externalOrgId: meatOrgId
      }
    },
    update: {
      pulseOrganizationId: texasOrg.id
    },
    create: {
      provider: 'BRASA_MEAT',
      externalOrgId: meatOrgId,
      pulseOrganizationId: texasOrg.id
    }
  });

  // Also maintain alias tdb-main in external mapping table
  await db.externalOrganizationIdentity.upsert({
    where: {
      provider_externalOrgId: {
        provider: 'BRASA_MEAT',
        externalOrgId: 'tdb-main'
      }
    },
    update: {
      pulseOrganizationId: texasOrg.id
    },
    create: {
      provider: 'BRASA_MEAT',
      externalOrgId: 'tdb-main',
      pulseOrganizationId: texasOrg.id
    }
  });

  console.log('✔ ExternalOrganizationIdentity mappings updated 100%.\n');
}

fixOrgMapping().catch(err => {
  console.error('Fix failed:', err);
  process.exit(1);
});
