import { db } from '../src/lib/db';
import { evaluateCompetitiveRelevance } from '../src/lib/scout/competitiveRelevanceEngine';

async function recalibrateCandidatesPhase4B() {
  console.log('==================================================');
  console.log('PHASE 4B — COMPETITIVE RELEVANCE RECALIBRATION');
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
              brand: true,
              externalSources: {
                include: { snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 } }
              }
            }
          }
        }
      }
    }
  });

  if (!compSet || compSet.members.length === 0) {
    console.log('No existing set members found in DB. Run live discovery first.');
    return;
  }

  console.log(`Found ${compSet.members.length} set member(s) to recalibrate.\n`);

  const recalibratedReport: Array<{
    candidate: string;
    brandName: string;
    placeId: string;
    previousRelevance: number;
    recalibratedRelevance: number;
    recommendedClassification: string;
    confidence: string;
    serviceModel: string;
    priceTier: string;
    reviewCount: number;
    keyEvidence: string;
    unknownDimensions: string[];
    approvalStatus: string;
  }> = [];

  for (const mem of compSet.members) {
    const comp = mem.competitor;
    const extSource = comp.externalSources[0];
    const snap = extSource?.snapshots[0];

    const prevScore = mem.relevanceScore || Math.round((mem.matchScore || 0.8) * 100);

    // Recalculate with calibrated engine
    const evalRes = evaluateCompetitiveRelevance(
      {
        name: texasLoc.name,
        latitude: texasLoc.latitude || 27.9653,
        longitude: texasLoc.longitude || -82.5186,
        serviceModel: 'Full-service Churrascaria / Rodizio',
        priceTier: 'PRICE_LEVEL_EXPENSIVE'
      },
      {
        name: comp.name,
        address: `${comp.address}, ${comp.city}, ${comp.state}`,
        latitude: comp.latitude,
        longitude: comp.longitude,
        serviceModel: comp.serviceModel,
        priceTier: comp.priceTier,
        googleRating: snap?.rating,
        reviewCount: snap?.reviewCount,
        placeId: extSource?.externalLocationId
      }
    );

    // Update database record with calibrated score
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
        explanation: evalRes.explanation,
        evidence: evalRes.dimensions as any
      }
    });

    const unknownDims: string[] = [];
    if (evalRes.dimensions.serviceModel.isUnknown) unknownDims.push('ServiceModel');
    if (evalRes.dimensions.priceTier.isUnknown) unknownDims.push('PriceTier');
    if (evalRes.dimensions.occasion.isUnknown) unknownDims.push('Occasion');

    recalibratedReport.push({
      candidate: comp.name,
      brandName: comp.brand?.name || comp.name,
      placeId: extSource?.externalLocationId || 'N/A',
      previousRelevance: prevScore,
      recalibratedRelevance: evalRes.relevanceScore,
      recommendedClassification: evalRes.relevanceClassification,
      confidence: evalRes.confidence,
      serviceModel: evalRes.dimensions.serviceModel.evidence,
      priceTier: comp.priceTier || 'UNKNOWN',
      reviewCount: snap?.reviewCount || 0,
      keyEvidence: evalRes.explanation,
      unknownDimensions: unknownDims.length > 0 ? unknownDims : ['None'],
      approvalStatus: mem.status
    });
  }

  // Sort by Recalibrated Relevance Score descending
  recalibratedReport.sort((a, b) => b.recalibratedRelevance - a.recalibratedRelevance);

  console.log('==================================================');
  console.log('RECALIBRATED COMPETITOR CANDIDATES REPORT');
  console.log('==================================================\n');

  recalibratedReport.forEach((item, idx) => {
    console.log(`[${idx + 1}] ${item.candidate}`);
    console.log(`    • Brand Group: ${item.brandName}`);
    console.log(`    • Previous Relevance: ${item.previousRelevance} / 100`);
    console.log(`    • Recalibrated Relevance: ${item.recalibratedRelevance} / 100 (${item.recommendedClassification})`);
    console.log(`    • Confidence: ${item.confidence}`);
    console.log(`    • Service Model: ${item.serviceModel}`);
    console.log(`    • Price Tier: ${item.priceTier}`);
    console.log(`    • Review Count: ${item.reviewCount.toLocaleString()} reviews`);
    console.log(`    • Unknown Dimensions: ${item.unknownDimensions.join(', ')}`);
    console.log(`    • Approval Status: ${item.approvalStatus} (0 auto-approved)\n`);
  });

  const liveApprovedCount = await db.competitiveSetMember.count({
    where: { status: 'APPROVED', approvedByUser: true, provenanceMode: { in: ['LIVE', 'IMPORTED'] } }
  });

  console.log('--------------------------------------------------');
  console.log(`LIVE Approved Competitors Count: ${liveApprovedCount}`);
  console.log('--------------------------------------------------\n');

  console.log('==================================================');
  console.log('🎉 RECALIBRATION COMPLETE!');
  console.log('==================================================');
}

recalibrateCandidatesPhase4B().catch(err => {
  console.error('\n❌ RECALIBRATION FAILED:', err);
  process.exit(1);
});
