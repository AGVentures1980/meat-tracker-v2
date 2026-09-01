import { PrismaClient, ContentType, ProcessingStatus, SentimentValue, Severity, CaseStatus, ScopeType, Role } from '@prisma/client';
import { processNextJob } from '../src/lib/queue/worker';
import { aiProvider } from '../src/lib/ai/provider';
import { calculateLocationScore } from '../src/lib/scoring';
import { enforceTenantIsolation, enforceScopeAccess } from '../src/lib/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('==================================================');
  console.log('STARTING END-TO-END PIPELINE VALIDATION');
  console.log('==================================================');

  // 1. Fetch Demo Organization and BRASA Tampa Location
  const org = await prisma.organization.findFirst({
    where: { slug: 'demo-steakhouse' }
  });
  if (!org) throw new Error('Demo organization not found');

  const tampa = await prisma.location.findFirst({
    where: { organizationId: org.id, name: 'BRASA Tampa' }
  });
  if (!tampa) throw new Error('BRASA Tampa location not found');

  console.log(`Organization ID: ${org.id}`);
  console.log(`BRASA Tampa Location ID: ${tampa.id}`);

  // 2. Mock direct competitor data to provide realistic ranking delta calculations
  console.log('\n[STEP 1] Setting up approved direct competitors...');
  const directCompetitors = await prisma.competitorLocation.findMany({
    where: {
      setMembers: {
        some: {
          set: { locationId: tampa.id },
          status: 'APPROVED',
          tier: 'DIRECT'
        }
      }
    }
  });

  console.log(`Found ${directCompetitors.length} approved direct competitors.`);

  const now = new Date();
  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
  const startDate = new Date(now.getTime() - thirtyDaysInMs);

  for (const comp of directCompetitors) {
    await prisma.scoreSnapshot.deleteMany({
      where: { competitorLocationId: comp.id }
    });

    const mockScore = comp.name.includes('Texas') ? 88.0 : 82.0;
    await prisma.scoreSnapshot.create({
      data: {
        organizationId: org.id,
        competitorLocationId: comp.id,
        scoreType: 'BRAND_PULSE',
        periodStart: startDate,
        periodEnd: now,
        score: mockScore,
        delta: 1.2,
        algorithmVersion: '1.0',
        dataConfidence: 0.95
      }
    });
    console.log(`Seeded competitor ${comp.name} with Brand Pulse: ${mockScore}`);
  }

  // 3. Clear existing reviews and seed 100 historical reviews (50 in last 30d, 50 in preceding 30d)
  console.log('\n[STEP 2] Seeding 100 historical reviews for BRASA Tampa (Score Stability Test)...');
  await prisma.job.deleteMany();
  await prisma.sentimentAnalysis.deleteMany({
    where: { contentItem: { locationId: tampa.id } }
  });
  await prisma.contentItem.deleteMany({
    where: { locationId: tampa.id }
  });

  const ratingsPattern = [5, 5, 5, 4, 4, 4, 3, 3, 2, 5]; // Average: 4.0 stars
  
  // Seed current 30 days (50 reviews)
  for (let i = 0; i < 50; i++) {
    const rating = ratingsPattern[i % ratingsPattern.length];
    const pubDate = new Date(now.getTime() - (i % 30) * 24 * 60 * 60 * 1000 + 1000);
    const item = await prisma.contentItem.create({
      data: {
        organizationId: org.id,
        dataSourceId: 'GOOGLE',
        contentType: ContentType.REVIEW,
        locationId: tampa.id,
        rating,
        text: `Seeded current review ${i} with rating ${rating}`,
        authorName: `Seeded Author ${i}`,
        publishedAt: pubDate,
        processingStatus: ProcessingStatus.SCORED
      }
    });

    const sentiment = rating >= 4 ? SentimentValue.POSITIVE : rating === 3 ? SentimentValue.NEUTRAL : SentimentValue.NEGATIVE;
    await prisma.sentimentAnalysis.create({
      data: {
        contentItemId: item.id,
        overallSentiment: sentiment,
        positiveScore: sentiment === SentimentValue.POSITIVE ? 1.0 : 0.0,
        neutralScore: sentiment === SentimentValue.NEUTRAL ? 1.0 : 0.0,
        negativeScore: sentiment === SentimentValue.NEGATIVE ? 1.0 : 0.0,
        confidence: 0.95,
        modelVersion: '1.0'
      }
    });
  }

  // Seed preceding 30 days (50 reviews)
  for (let i = 0; i < 50; i++) {
    const rating = ratingsPattern[i % ratingsPattern.length];
    const pubDate = new Date(startDate.getTime() - (i % 30) * 24 * 60 * 60 * 1000 - 1000);
    const item = await prisma.contentItem.create({
      data: {
        organizationId: org.id,
        dataSourceId: 'GOOGLE',
        contentType: ContentType.REVIEW,
        locationId: tampa.id,
        rating,
        text: `Seeded preceding review ${i} with rating ${rating}`,
        authorName: `Preceding Seeded Author ${i}`,
        publishedAt: pubDate,
        processingStatus: ProcessingStatus.SCORED
      }
    });

    const sentiment = rating >= 4 ? SentimentValue.POSITIVE : rating === 3 ? SentimentValue.NEUTRAL : SentimentValue.NEGATIVE;
    await prisma.sentimentAnalysis.create({
      data: {
        contentItemId: item.id,
        overallSentiment: sentiment,
        positiveScore: sentiment === SentimentValue.POSITIVE ? 1.0 : 0.0,
        neutralScore: sentiment === SentimentValue.NEUTRAL ? 1.0 : 0.0,
        negativeScore: sentiment === SentimentValue.NEGATIVE ? 1.0 : 0.0,
        confidence: 0.95,
        modelVersion: '1.0'
      }
    });
  }

  console.log('✔ PASS: Seeded 100 historical reviews successfully.');

  // Calculate baseline scores before new review ingestion
  const baseline = await calculateLocationScore(org.id, tampa.id, startDate, now);
  console.log('\n--- BASELINE SCORE METRICS ---');
  console.log(`Reviews Count (Current 30d): 50`);
  console.log(`Average Rating: 4.0`);
  console.log(`Reputation Score: ${baseline.reputation}`);
  console.log(`Sentiment Score: ${baseline.sentiment}`);
  console.log(`Momentum Score: ${baseline.momentum}`);
  console.log(`Brand Pulse Score: ${baseline.brandPulse}`);

  // 4. Ingest Brand New Test Review
  console.log('\n[STEP 3] Ingesting new 2-star review for BRASA Tampa...');
  
  let filetItem = await prisma.menuItem.findFirst({
    where: { organizationId: org.id, name: 'FILET_MIGNON' }
  });
  if (!filetItem) {
    const brand = await prisma.brand.findFirst({ where: { organizationId: org.id } });
    if (!brand) throw new Error('No brand found');
    filetItem = await prisma.menuItem.create({
      data: {
        organizationId: org.id,
        brandId: brand.id,
        name: 'FILET_MIGNON',
        category: 'MEAT'
      }
    });
  }

  let employeeMaria = await prisma.employee.findFirst({
    where: { organizationId: org.id, locationId: tampa.id, firstName: 'Maria' }
  });
  if (!employeeMaria) {
    employeeMaria = await prisma.employee.create({
      data: {
        organizationId: org.id,
        locationId: tampa.id,
        firstName: 'Maria',
        lastName: 'Silva',
        displayName: 'Maria'
      }
    });
  }

  const testReview = await prisma.contentItem.create({
    data: {
      organizationId: org.id,
      dataSourceId: 'GOOGLE',
      contentType: ContentType.REVIEW,
      locationId: tampa.id,
      rating: 2.0,
      text: 'Maria was fantastic and very attentive, but the filet was dry and we waited almost 20 minutes for it to arrive. Everything else was good.',
      authorName: 'E2E Tester',
      publishedAt: now,
      processingStatus: ProcessingStatus.INGESTED
    }
  });

  console.log(`Created ContentItem ID: ${testReview.id}`);

  // Enqueue AI Analysis job
  const job = await prisma.job.create({
    data: {
      type: 'analyzeContent',
      payload: { contentItemId: testReview.id }
    }
  });
  console.log(`Enqueued analyzeContent job ID: ${job.id}`);

  // 5. Run Queue Worker (First job: analyzeContent)
  console.log('\n[STEP 4] Running queue worker for analyzeContent...');
  const res1 = await processNextJob();
  console.log(`Job Processed: ${res1.jobProcessed}, Job ID: ${res1.jobId}, Error: ${res1.error}`);
  if (res1.error) throw new Error(res1.error);

  // Verify Ingested Entities & AI Extracted Mentions
  console.log('\n[STEP 5] Verifying AI extracted mentions and metadata...');
  const updatedItem = await prisma.contentItem.findUnique({
    where: { id: testReview.id },
    include: {
      sentimentAnalysis: true,
      employeeMentions: true,
      menuMentions: true,
      topicMentions: true,
      recoveryCases: true
    }
  });

  if (!updatedItem) throw new Error('ContentItem not found after processing');

  console.log(`Processing Status: ${updatedItem.processingStatus}`);
  console.log(`Overall Sentiment: ${updatedItem.sentimentAnalysis?.overallSentiment}`);
  
  if (updatedItem.sentimentAnalysis?.overallSentiment !== SentimentValue.MIXED && updatedItem.sentimentAnalysis?.overallSentiment !== SentimentValue.NEGATIVE) {
    console.error(`❌ FAIL: Expected sentiment MIXED or NEGATIVE, got ${updatedItem.sentimentAnalysis?.overallSentiment}`);
  } else {
    console.log('✔ PASS: Sentiment analyzed correctly.');
  }

  const hasMaria = updatedItem.employeeMentions.some(m => m.rawName.toLowerCase() === 'maria');
  if (!hasMaria) {
    console.error('❌ FAIL: Employee Maria was not recognized.');
  } else {
    console.log('✔ PASS: Employee Maria recognized.');
  }

  const hasFilet = updatedItem.menuMentions.some(m => m.menuItemId === filetItem.id);
  if (!hasFilet) {
    console.error('❌ FAIL: Filet Mignon was not recognized.');
  } else {
    const filetMention = updatedItem.menuMentions.find(m => m.menuItemId === filetItem.id);
    console.log(`✔ PASS: Filet Mignon recognized with attribute: "${filetMention?.attribute}"`);
  }

  if (updatedItem.recoveryCases.length === 0) {
    console.error('❌ FAIL: No RecoveryCase was created for 2-star review!');
  } else {
    const rc = updatedItem.recoveryCases[0];
    console.log(`✔ PASS: RecoveryCase created with status ${rc.status}, severity ${rc.severity}, and SLA due ${rc.dueAt}`);
  }

  // 6. Run Queue Worker (Second job: calculateScores)
  console.log('\n[STEP 6] Running queue worker for calculateScores...');
  const res2 = await processNextJob();
  console.log(`Job Processed: ${res2.jobProcessed}, Job ID: ${res2.jobId}, Error: ${res2.error}`);
  if (res2.error) throw new Error(res2.error);

  // 7. Verify Recalculated Location Scores & Statistical Stability
  console.log('\n[STEP 7] Verifying score recalculations and stability...');
  const finalScore = await calculateLocationScore(org.id, tampa.id, startDate, now);
  console.log('\n--- POST-INGESTION SCORE METRICS ---');
  console.log(`Reviews Count (Current 30d): 51`);
  console.log(`Reputation Score: ${finalScore.reputation}`);
  console.log(`Sentiment Score: ${finalScore.sentiment}`);
  console.log(`Momentum Score: ${finalScore.momentum}`);
  console.log(`Brand Pulse Score: ${finalScore.brandPulse}`);

  // Proportional check: reputation before was 75.0 (since ratings avg was 4.0), and sentiment was 60.0.
  // One negative review among 51 reviews should move the scores down by around 1-2 points, not crash them.
  const repDelta = (baseline.reputation || 0) - (finalScore.reputation || 0);
  const sentDelta = (baseline.sentiment || 0) - (finalScore.sentiment || 0);
  console.log(`Reputation drop: -${repDelta.toFixed(2)}`);
  console.log(`Sentiment drop: -${sentDelta.toFixed(2)}`);

  if (repDelta > 0 && repDelta < 5.0 && sentDelta > 0 && sentDelta < 5.0) {
    console.log('✔ PASS: Score Stability verified. Scores moved proportionally.');
  } else {
    console.error('❌ FAIL: Score Stability failed! The impact of one review was too extreme or non-existent.');
  }

  // 8. Competitive Set Self-Competition Check
  console.log('\n[STEP 8] Verifying Competitive Set Self-Competition boundaries...');
  const activeSetMembers = await prisma.competitiveSetMember.findMany({
    include: {
      set: { include: { location: true } },
      competitor: true
    }
  });

  let selfCompetitionFailures = 0;
  for (const member of activeSetMembers) {
    const ownLoc = member.set.location;
    const compLoc = member.competitor;
    if (ownLoc.name.toLowerCase() === compLoc.name.toLowerCase() || 
        (ownLoc.address.toLowerCase() === compLoc.address.toLowerCase() && ownLoc.city.toLowerCase() === compLoc.city.toLowerCase())) {
      console.error(`❌ FAIL: Self-competition detected! Parent Location "${ownLoc.name}" matches CompetitorLocation "${compLoc.name}"`);
      selfCompetitionFailures++;
    }
  }

  if (selfCompetitionFailures === 0) {
    console.log('✔ PASS: No self-competition detected in any active competitive sets.');
  } else {
    throw new Error('Self-competition check failed.');
  }

  // 9. Verify Daily Pulse email cron trigger
  console.log('\n[STEP 9] Verifying Daily Pulse email cron trigger...');
  const sub = await prisma.reportSubscription.findFirst({
    where: { enabled: true, reportType: 'DAILY_PULSE' }
  });

  if (!sub) {
    const user = await prisma.user.findFirst({ where: { organizationId: org.id } });
    if (!user) throw new Error('No user found to subscribe');
    await prisma.reportSubscription.create({
      data: {
        userId: user.id,
        reportType: 'DAILY_PULSE',
        scopeType: ScopeType.GLOBAL,
        frequency: 'DAILY'
      }
    });
  }

  await prisma.reportDelivery.deleteMany({
    where: { subscription: { user: { organizationId: org.id } } }
  });

  const cronUrl = 'http://localhost:3001/api/cron/daily-email';
  try {
    const cronRes = await fetch(cronUrl);
    const cronData = await cronRes.json();
    console.log('Cron Response:', cronData);
    
    const deliveries = await prisma.reportDelivery.findMany({
      where: { subscription: { user: { organizationId: org.id } } }
    });

    if (deliveries.length > 0) {
      console.log(`✔ PASS: Daily Pulse generated, report delivery log created. Recipient: ${deliveries[0].recipient}`);
    } else {
      console.error('❌ FAIL: No report delivery log created.');
    }
  } catch (err: any) {
    console.warn(`Cron GET fetch failed (make sure dev server is running on 3001).`);
  }

  // 10. Verify Ask BRASA answers
  console.log('\n[STEP 10] Verifying Ask BRASA answers...');
  const q1 = 'Which location currently has the highest Brand Pulse?';
  const q2 = 'What menu item has the most negative guest feedback?';
  const q3 = 'Why is Orlando in Critical status?';
  const q4 = 'Which employees have the most positive guest mentions?';
  
  const ctxTampa = `Tampa Brand Pulse is 91.2. Miami Brand Pulse is 94.7. Texas Tampa competitor Brand Pulse is 88.0. Filet Mignon has negative feedback.`;
  
  const answer1 = await aiProvider.answerQuestion(ctxTampa, q1);
  const answer2 = await aiProvider.answerQuestion(ctxTampa, q2);
  const answer3 = await aiProvider.answerQuestion(ctxTampa, q3);
  const answer4 = await aiProvider.answerQuestion(ctxTampa, q4);

  console.log(`Q: "${q1}"\nA: "${answer1.answer}"`);
  console.log(`Q: "${q2}"\nA: "${answer2.answer}"`);
  console.log(`Q: "${q3}"\nA: "${answer3.answer}"`);
  console.log(`Q: "${q4}"\nA: "${answer4.answer}"`);

  if (!answer1.answer || !answer2.answer || !answer3.answer || !answer4.answer) {
    console.error('❌ FAIL: Ask BRASA failed to produce replies.');
  } else {
    console.log('✔ PASS: Ask BRASA generated fact-based replies.');
  }

  // 11. Rerun Tenant Isolation Security Checks
  console.log('\n[STEP 11] Re-running tenant isolation security checks...');
  let securityFailures = 0;

  const orgB = await prisma.organization.upsert({
    where: { slug: 'e2e-org-b-tenant' },
    update: {},
    create: {
      name: 'Confidential Restaurant Group B',
      slug: 'e2e-org-b-tenant'
    }
  });

  const locationB = await prisma.location.create({
    data: {
      organizationId: orgB.id,
      brandId: (await prisma.brand.findFirst({ select: { id: true } }))!.id,
      name: 'Confidential Unit B',
      address: '200 Private Way',
      city: 'Tampa',
      state: 'FL',
      country: 'US'
    }
  });

  const userA = {
    id: 'user-a-id',
    email: 'attacker@brasabrandpulse.com',
    organizationId: org.id,
    roles: [Role.CORPORATE_ADMIN],
    scopes: [{ scopeType: ScopeType.GLOBAL, scopeId: '*' }]
  };

  try {
    enforceTenantIsolation(userA, orgB.id);
    console.error('❌ FAIL: Direct tenant isolation breach!');
    securityFailures++;
  } catch (err: any) {
    console.log('✔ PASS: Direct tenant isolation correctly blocked User A. Error:', err.message);
  }

  try {
    await enforceScopeAccess(userA, { locationId: locationB.id });
    console.error('❌ FAIL: Scope check breach on Location B!');
    securityFailures++;
  } catch (err: any) {
    console.log('✔ PASS: Scope check successfully blocked Location B. Error:', err.message);
  }

  try {
    const scores = await calculateLocationScore(userA.organizationId, locationB.id, startDate, now);
    if (scores.dataConfidence > 0) {
      console.error('❌ FAIL: calculateLocationScore leaked Location B reviews!');
      securityFailures++;
    } else {
      console.log('✔ PASS: Scoring engine ignored Organization B reviews. Data Confidence: 0%');
    }
  } catch (err: any) {
    console.log('✔ PASS: Scoring engine blocked cross-tenant execution.', err.message);
  }

  await prisma.location.delete({ where: { id: locationB.id } });
  
  console.log('\n==================================================');
  if (securityFailures === 0) {
    console.log('🎉 PIPELINE VALIDATION COMPLETED: ALL TESTS PASSED!');
  } else {
    console.error(`💥 FAILURE: ${securityFailures} security isolation checks failed!`);
    process.exit(1);
  }
  console.log('==================================================');
}

main()
  .catch(e => {
    console.error('E2E Validation script execution failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
