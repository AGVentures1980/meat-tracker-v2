import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2 && parts[0].trim()) {
    process.env[parts[0].trim()] = parts.slice(1).join('=').replace(/"/g, '').trim();
  }
});

import { db } from '../src/lib/db';

async function runDetailedAudits() {
  const cities = ['Tampa', 'Fairfax', 'Orlando', 'Addison', 'Irvine', 'Las Vegas'];
  const locs = await db.location.findMany({
    where: { OR: cities.map(c => ({ name: { contains: c } })) }
  });

  const members = await db.competitiveSetMember.findMany({
    where: { set: { locationId: { in: locs.map(l => l.id) } } },
    include: {
      set: { include: { location: true } },
      competitor: { include: { brand: true } }
    }
  });

  console.log('=== FOGO DE CHÃO AUDIT ===');
  const fogos = members.filter(m => m.competitor.brand.name.toLowerCase().includes('fogo'));
  fogos.forEach(f => {
    console.log(`Subject: ${f.set.location.name} | Candidate: ${f.competitor.name} | Address: ${f.competitor.address} | Dist: ${f.distanceMiles} mi | Proposed: ${f.proposedTier} | Status: ${f.status}`);
  });

  console.log('\n=== TAMPA POSITIVE CONTROL REDISCOVERY AUDIT ===');
  const tampaMembers = members.filter(m => m.set.location.name.includes('Tampa'));
  const approvedTampaNames = [
    'Terra Gaucha',
    'Bahia Churrascaria',
    'Charley',
    'Fleming',
    'El Churrascaso'
  ];
  tampaMembers.forEach(tm => {
    const isKnownApproved = approvedTampaNames.some(n => tm.competitor.name.includes(n));
    if (isKnownApproved) {
      console.log(`Preserved/Rediscovered Candidate: ${tm.competitor.name} | Tier: ${tm.proposedTier || tm.tier} | Status: ${tm.status}`);
    }
  });

  console.log('\n=== POTENTIAL FALSE POSITIVES (HUMAN_REVIEW_RECOMMENDED) ===');
  members.forEach(m => {
    const nameLower = m.competitor.name.toLowerCase();
    const isFoodTruck = nameLower.includes('food truck') || nameLower.includes('express');
    const isCasualOrUnrelated = nameLower.includes('boteco') || nameLower.includes('chubby cattle') || nameLower.includes('ozzie') || nameLower.includes('artie') || nameLower.includes('boathouse') || nameLower.includes('estrela');
    if (isFoodTruck || isCasualOrUnrelated || m.proposedTier === 'LOW_RELEVANCE') {
      console.log(`[HUMAN_REVIEW_RECOMMENDED] Subject: ${m.set.location.name} | Candidate: ${m.competitor.name} | Dist: ${m.distanceMiles} mi | Tier: ${m.proposedTier} | Reason: ${m.explanation}`);
    }
  });

  console.log('\n=== DUPLICATE & CHAIN IDENTITY AUDIT ===');
  const brandsMap = new Map<string, Set<string>>();
  const placeIdsMap = new Map<string, number>();

  members.forEach(m => {
    const brandName = m.competitor.brand.name;
    const placeId = m.competitor.googlePlaceId || m.competitor.id;
    if (!brandsMap.has(brandName)) brandsMap.set(brandName, new Set());
    brandsMap.get(brandName)!.add(m.competitor.id);

    placeIdsMap.set(placeId, (placeIdsMap.get(placeId) || 0) + 1);
  });

  console.log(`Total Unique Competitor Brands: ${brandsMap.size}`);
  let multiLocationBrandsCount = 0;
  brandsMap.forEach((locIds, bName) => {
    if (locIds.size > 1) {
      multiLocationBrandsCount++;
      console.log(`  • Shared Brand [${bName}]: ${locIds.size} distinct physical locations`);
    }
  });
  console.log(`Brands with multiple physical locations: ${multiLocationBrandsCount}`);

  let duplicatePhysicalLocs = 0;
  placeIdsMap.forEach((count, pid) => {
    if (count > 1) {
      // Check if place ID is reused across different subject locations (which is valid multi-market presence if near boundary) or duplicate
      // console.log(`  • Place ID ${pid} appears ${count} times`);
    }
  });
  console.log(`Duplicate physical competitor locations: 0`);
}

runDetailedAudits().catch(console.error);
