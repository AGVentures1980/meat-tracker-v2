import { db } from '../src/lib/db';

async function verifyTampa() {
  console.log('==================================================');
  console.log('VERIFYING CANONICAL TAMPA LOCATION');
  console.log('==================================================\n');

  const tampa = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' } }
  });

  if (!tampa) throw new Error('Tampa location not found!');

  console.log(`Found Tampa Location ID: ${tampa.id}`);
  console.log(`Name: ${tampa.name}`);
  console.log(`Address: ${tampa.address}`);
  console.log(`Current googlePlaceId: ${tampa.googlePlaceId}`);

  // Set Place ID if not set
  if (!tampa.googlePlaceId) {
    const updated = await db.location.update({
      where: { id: tampa.id },
      data: {
        googlePlaceId: 'ChIJHdigC67DwogRkWjPRn8SUbQ',
        businessStatus: 'OPERATIONAL',
        verificationStatus: 'VERIFIED',
        lastVerifiedAt: new Date(),
        market: 'Tampa Bay'
      }
    });
    console.log(`Updated Tampa googlePlaceId: ${updated.googlePlaceId}`);
  }

  // Count ContentItems
  const contentItemCount = await db.contentItem.count({
    where: { locationId: tampa.id, provenanceMode: 'IMPORTED' }
  });

  console.log(`Authentic ContentItems for Tampa: ${contentItemCount} (Expected: 33)`);
}

verifyTampa().catch(console.error);
