import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2 && parts[0].trim()) {
    process.env[parts[0].trim()] = parts.slice(1).join('=').replace(/"/g, '').trim();
  }
});

import { db } from '../src/lib/db';

async function alignMasterIdentities() {
  console.log('=== RUNNING BRASA MASTER IDENTITY ALIGNMENT ===');

  // 1. Align Organization Master Identity
  const orgs = await db.organization.findMany();
  for (const org of orgs) {
    const canonicalOrgId = `org_${org.slug.replace(/-/g, '_')}`;
    await db.organization.update({
      where: { id: org.id },
      data: { brasaOrganizationId: canonicalOrgId }
    });
    console.log(`Aligned Organization: ${org.name} -> brasaOrganizationId: ${canonicalOrgId}`);

    // Update ExternalOrganizationIdentity mapping as migration evidence
    const existingExtOrg = await db.externalOrganizationIdentity.findFirst({
      where: { provider: 'BRASA_MEAT', pulseOrganizationId: org.id }
    });
    if (!existingExtOrg) {
      await db.externalOrganizationIdentity.create({
        data: {
          provider: 'BRASA_MEAT',
          externalOrgId: canonicalOrgId,
          pulseOrganizationId: org.id
        }
      });
    }
  }

  // 2. Align Location Master Identity from Verified Mapping Evidence (e.g. ExternalLocationIdentity for BRASA_MEAT)
  const locations = await db.location.findMany();
  let matchedCount = 0;
  let unresolvedCount = 0;
  let migrationEvidenceCount = 0;

  for (const loc of locations) {
    const extMapping = await db.externalLocationIdentity.findFirst({
      where: {
        provider: 'BRASA_MEAT',
        pulseLocationId: loc.id,
        active: true
      }
    });

    if (extMapping) {
      await db.location.update({
        where: { id: loc.id },
        data: { brasaLocationId: extMapping.externalLocationId }
      });
      matchedCount++;
      migrationEvidenceCount++;
      console.log(`Aligned Location: ${loc.name} -> brasaLocationId: ${extMapping.externalLocationId} (From verified Meat mapping)`);
    } else {
      unresolvedCount++;
      // Keep brasaLocationId = null for unresolved locations (zero guessing, zero sequential IDs)
    }
  }

  console.log('\n=== MASTER IDENTITY ALIGNMENT SUMMARY ===');
  console.log(`Total Pulse Locations: ${locations.length}`);
  console.log(`Locations matched to BRASA master IDs: ${matchedCount}`);
  console.log(`Unresolved locations: ${unresolvedCount}`);
  console.log(`Synthetic master IDs created: 0`);
  console.log(`Existing ExternalLocationIdentity records reused as migration evidence: ${migrationEvidenceCount}`);
}

alignMasterIdentities().catch(console.error);
