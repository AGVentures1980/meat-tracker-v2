import { db } from '../src/lib/db';
import { evaluateCompetitiveRelevance } from '../src/lib/scout/competitiveRelevanceEngine';

async function fixCompetitorDedupAndProvenance() {
  console.log('==================================================');
  console.log('CLEANING DUPES & LEGACY TEST FIXTURES IN COMPETITORS');
  console.log('==================================================\n');

  const tenantOrg = await db.organization.findFirst({ where: { name: { contains: 'Demo' } } }) || await db.organization.findFirst();
  if (!tenantOrg) throw new Error('Tenant organization missing');

  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Texas de Brazil location missing');

  const compSet = await db.competitiveSet.findFirst({
    where: { organizationId: tenantOrg.id, locationId: texasLoc.id },
    include: {
      members: {
        include: {
          competitor: {
            include: {
              externalSources: {
                include: { snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 } }
              }
            }
          }
        }
      }
    }
  });

  if (!compSet) throw new Error('Competitive set missing');

  console.log(`Auditing ${compSet.members.length} set member(s)...`);

  // Target Official Google Places API Place IDs discovered for Tampa
  const officialLivePlaceIds = new Set([
    'ChIJ5XkDzRfDwogRnH0PSg_mFGk', // Terra Gaucha (7,345 reviews, 2.4 mi)
    'ChIJpbHvSdrBwogRJPRuAGCHWSg', // Bahia Churrascaria (2,540 reviews, 7.2 mi)
    'ChIJHUT6O_7CwogR5cYxe7yk5nM', // Charley's Steak House (5,710 reviews, 1.0 mi)
    'ChIJVwY-iKzDwogRertNM1YPMjg', // Fleming's Prime Steakhouse (4,182 reviews, 0.3 mi)
    'ChIJn5Z0ZePlwogR6jTE6D6G0N8', // Terra Mar Brazilian Steakhouse (751 reviews, 14.3 mi)
    'ChIJATbxbGrpwogRC4OgXnnmLwU', // El Churrascaso Grill Tampa (1,620 reviews, 4.3 mi)
    'ChIJ3Xm8q73DwogR0xP3kM76C90', // Brazas Grill Tampa (410 reviews, 2.8 mi)
    'ChIJpxvtv47DwogRReiKNchxx9M', // Mister Churrasco (14 reviews, 3.3 mi)
    'ChIJiWTxIS7dwogRCRFc-h3mXkI', // El Churrascaso Food Truck (104 reviews, 5.0 mi)
    'ChIJz-r4PA7BwogRiAnH8BNVagI', // El Churrascaso Food Truck (1,060 reviews, 4.5 mi)
    'ChIJUY1pZADNwogR9fuISFl90ro'  // Leña Churrascaria Food Truck (228 reviews, 14.3 mi)
  ]);

  let removedCount = 0;
  let updatedCount = 0;

  for (const mem of compSet.members) {
    const comp = mem.competitor;
    const extSource = comp.externalSources[0];
    const placeId = extSource?.externalLocationId;

    // Check if this record is an unofficial fixture (e.g. Terra Gaucha ChIJJT1c_K3DwogR... with 3,120 reviews)
    if (!placeId || !officialLivePlaceIds.has(placeId)) {
      console.log(`❌ Removing unofficial/duplicate fixture member ID: ${mem.id} ("${comp.name}", Place ID: ${placeId || 'N/A'})`);
      
      await db.competitiveSetMember.update({
        where: { id: mem.id },
        data: {
          provenanceMode: 'DEMO',
          status: 'REJECTED',
          approvedByUser: false,
          approvalReason: 'UNVERIFIED_FIXTURE: Removed duplicate/test fixture record.'
        }
      });
      removedCount++;
    } else {
      // Re-evaluate with exact calibrated engine
      const snap = extSource?.snapshots[0];
      const evalRes = evaluateCompetitiveRelevance(
        { name: texasLoc.name, latitude: texasLoc.latitude || 27.9653, longitude: texasLoc.longitude || -82.5186 },
        {
          name: comp.name,
          address: `${comp.address}, ${comp.city}, ${comp.state}`,
          latitude: comp.latitude,
          longitude: comp.longitude,
          serviceModel: comp.serviceModel,
          priceTier: comp.priceTier,
          googleRating: snap?.rating,
          reviewCount: snap?.reviewCount,
          placeId
        }
      );

      // Force Terra Mar (14.3 mi) to SECONDARY
      let recommendedRole = evalRes.recommendedCompetitiveRole;
      if (comp.name.includes('Terra Mar') || evalRes.distanceMiles > 10.0) {
        recommendedRole = 'SECONDARY';
      }

      await db.competitiveSetMember.update({
        where: { id: mem.id },
        data: {
          relevanceScore: evalRes.relevanceScore,
          matchScore: evalRes.relevanceScore,
          relevanceClassification: evalRes.relevanceClassification,
          confidence: evalRes.confidence,
          serviceModelFitScore: evalRes.serviceModelFitScore,
          cuisineFitScore: evalRes.cuisineFitScore,
          priceTierFitScore: evalRes.priceTierFitScore,
          occasionFitScore: evalRes.occasionFitScore,
          proximityScore: evalRes.proximityScore,
          brandFitScore: evalRes.brandFitScore,
          marketScaleScore: evalRes.marketScaleScore,
          distanceMiles: evalRes.distanceMiles,
          explanation: evalRes.explanation,
          evidence: {
            ...evalRes.dimensions,
            recommendedRole
          } as any,
          provenanceMode: 'LIVE'
        }
      });
      updatedCount++;
    }
  }

  console.log(`\nRemoved ${removedCount} duplicate/legacy test fixture(s).`);
  console.log(`Updated ${updatedCount} official Google Places API member(s).\n`);

  // Verify remaining active pending members
  const activePendingMembers = await db.competitiveSetMember.findMany({
    where: {
      set: { locationId: texasLoc.id },
      status: 'PENDING',
      provenanceMode: 'LIVE'
    },
    include: {
      competitor: {
        include: {
          externalSources: {
            include: { snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 } }
          }
        }
      }
    }
  });

  console.log(`--- OFFICIAL LIVE ADVISORY QUEUE (${activePendingMembers.length} candidates) ---`);
  activePendingMembers.forEach((mem, idx) => {
    const comp = mem.competitor;
    const extSource = comp.externalSources[0];
    const snap = extSource?.snapshots[0];
    const evidence = mem.evidence as any;
    const role = evidence?.recommendedRole || mem.relevanceClassification;

    console.log(`[${idx + 1}] ${comp.name}`);
    console.log(`    • Place ID: ${extSource?.externalLocationId}`);
    console.log(`    • Rating / Reviews: ${snap?.rating || 'N/A'} ★ (${snap?.reviewCount || 0} reviews)`);
    console.log(`    • Relevance Score: ${mem.relevanceScore} / 100`);
    console.log(`    • Recommended Role: ${role}`);
    console.log(`    • Distance: ${mem.distanceMiles} mi\n`);
  });

  console.log('==================================================');
  console.log('🎉 DEDUPLICATION & PROVENANCE CLEANUP COMPLETE');
  console.log('==================================================');
}

fixCompetitorDedupAndProvenance().catch(err => {
  console.error('\n❌ DEDUP CLEANUP FAILED:', err);
  process.exit(1);
});
