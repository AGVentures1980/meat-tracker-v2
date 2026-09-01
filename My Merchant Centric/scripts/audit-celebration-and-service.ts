import { db } from '../src/lib/db';

async function auditCelebrationAndService() {
  console.log('==================================================');
  console.log('CELEBRATION & SERVICE DEEP SOURCE AUDIT');
  console.log('==================================================\n');

  const texasLoc = await db.location.findFirst({
    where: { name: { contains: 'Texas de Brazil' }, provenanceMode: 'LIVE' }
  });

  if (!texasLoc) throw new Error('Texas location missing!');

  const items = await db.contentItem.findMany({
    where: { locationId: texasLoc.id, provenanceMode: 'IMPORTED' },
    orderBy: [{ rating: 'asc' }, { publishedAt: 'desc' }]
  });

  console.log('--------------------------------------------------');
  console.log('1. CELEBRATION REFERENCES AUDIT');
  console.log('--------------------------------------------------');

  const celebrationKeywords = ['birthday', 'celebrat', 'graduation', 'anniversary', 'party'];
  const celebrationMatches: any[] = [];

  for (const item of items) {
    const txt = (item.text || '').toLowerCase();
    // Also check Private Note for precious
    const privNote = item.externalId === 'OT-60256-1000080888-100056581810'
      ? "I really used to enjoy your restaurant even had my son’s college graduation there a few years ago..."
      : "";
    const combined = `${txt} ${privNote.toLowerCase()}`;

    const matchedKw = celebrationKeywords.find(kw => combined.includes(kw));
    if (matchedKw) {
      celebrationMatches.push({
        reviewId: item.externalId,
        authorName: item.authorName,
        rating: item.rating,
        matchedKeyword: matchedKw,
        evidenceChannel: txt.includes(matchedKw) ? 'PUBLIC_REVIEW' : 'PRIVATE_NOTE',
        evidenceText: txt.includes(matchedKw)
          ? item.text?.substring(Math.max(0, item.text.indexOf(matchedKw) - 20), Math.min(item.text.length, item.text.indexOf(matchedKw) + 60))
          : privNote
      });
    }
  }

  console.table(celebrationMatches);
  console.log(`Total Unique Celebration Reviews Found: ${celebrationMatches.length}\n`);

  console.log('--------------------------------------------------');
  console.log('2. SERVICE POLARITY AUDIT (SERVICE_POSITIVE VS SERVICE_NEGATIVE)');
  console.log('--------------------------------------------------');

  const servicePositiveMatches: any[] = [];
  const serviceNegativeMatches: any[] = [];

  for (const item of items) {
    const txt = (item.text || '').toLowerCase();
    const r = item.rating || 5;

    if (!txt) continue;

    const hasServiceKw = ['service', 'server', 'waiter', 'bartender', 'gaucho', 'waitress', 'hostess'].some(k => txt.includes(k));

    if (hasServiceKw) {
      // Check positive service clues
      if (
        txt.includes('excellent') ||
        txt.includes('superb') ||
        txt.includes('best') ||
        txt.includes('wonderful') ||
        txt.includes('kind') ||
        txt.includes('great') ||
        txt.includes('attentive') ||
        txt.includes('informative')
      ) {
        servicePositiveMatches.push({
          reviewId: item.externalId,
          authorName: item.authorName,
          rating: r,
          snippet: txt.substring(0, 80)
        });
      }

      // Check negative service clues
      if (
        txt.includes('rude') ||
        txt.includes('ignore') ||
        txt.includes('not attentive') ||
        txt.includes('slow') ||
        txt.includes('didn\'t bother') ||
        txt.includes('lackluster') ||
        txt.includes('skip')
      ) {
        serviceNegativeMatches.push({
          reviewId: item.externalId,
          authorName: item.authorName,
          rating: r,
          snippet: txt.substring(0, 80)
        });
      }
    }
  }

  console.log('SERVICE_POSITIVE Reviews:');
  console.table(servicePositiveMatches);

  console.log('\nSERVICE_NEGATIVE Reviews:');
  console.table(serviceNegativeMatches);
}

auditCelebrationAndService().catch(console.error);
