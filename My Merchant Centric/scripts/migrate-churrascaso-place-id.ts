import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    if (line.startsWith('GOOGLE_PLACES_API_KEY=')) {
      process.env.GOOGLE_PLACES_API_KEY = line.replace('GOOGLE_PLACES_API_KEY=', '').trim().replace(/^["']|["']$/g, '');
    }
  }
}

import { db } from '../src/lib/db';

async function migrateChurrascasoPlaceId() {
  console.log('==================================================');
  console.log('MIGRATING CHURRASCASO PHYSICAL STORE TO PLACE ID ChIJATbxbGrpwogRC4OgXnnmLwU');
  console.log('==================================================\n');

  const validPlaceId = 'ChIJATbxbGrpwogRC4OgXnnmLwU';
  const obsoletePlaceId = 'ChIJbV02xLDDwogR92jL0P3g1AA';

  const approvalReasonStr = 'Human competitive-set review — approved based on verified operating model, trade-area relevance, dining occasion and competitive proposition.';
  const approvedByAdmin = 'alexandre@brasabrandpulse.com';
  const approvalTimestamp = new Date();

  // Find physical Churrascaso competitor location
  const physicalChurrascasoLoc = await db.competitorLocation.findFirst({
    where: { name: 'El Churrascaso Grill Tampa' }
  });

  if (!physicalChurrascasoLoc) {
    throw new Error('Physical Churrascaso location not found in DB!');
  }

  // Update ExternalSource to point to valid Place ID ChIJATbxbGrpwogRC4OgXnnmLwU
  await db.externalSource.updateMany({
    where: { competitorLocationId: physicalChurrascasoLoc.id },
    data: { externalLocationId: validPlaceId }
  });

  // Ensure CompetitiveSetMember is APPROVED SECONDARY
  await db.competitiveSetMember.updateMany({
    where: { competitorLocationId: physicalChurrascasoLoc.id },
    data: {
      status: 'APPROVED',
      competitiveRole: 'SECONDARY',
      approvedByUser: true,
      approvedBy: approvedByAdmin,
      approvedAt: approvalTimestamp,
      approvalReason: approvalReasonStr,
      provenanceMode: 'LIVE'
    }
  });

  // Ensure obsolete ExternalSources with ChIJbV02xLDDwogR92jL0P3g1AA are deleted/rejected
  await db.externalSource.deleteMany({
    where: { externalLocationId: obsoletePlaceId }
  });

  console.log(`✔ Physical El Churrascaso location updated to valid Place ID: ${validPlaceId}`);
  console.log(`✔ Obsolete Place ID ${obsoletePlaceId} purged.\n`);
}

migrateChurrascasoPlaceId().catch(console.error);
