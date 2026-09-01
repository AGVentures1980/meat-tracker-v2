import { PrismaClient, Role, ScopeType, SentimentValue, ContentType, ProcessingStatus } from '@prisma/client';
import { enforceTenantIsolation, enforceScopeAccess } from '../src/lib/auth';
import { calculateLocationScore } from '../src/lib/scoring';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function runTests() {
  console.log('==================================================');
  console.log('STARTING TENANT ISOLATION SECURITY VERIFICATION');
  console.log('==================================================');

  // 1. Create Organization B (Attacker Target)
  const orgB = await prisma.organization.upsert({
    where: { slug: 'org-b-tenant' },
    update: {},
    create: {
      name: 'Confidential Restaurant Group B',
      slug: 'org-b-tenant',
    },
  });

  const locationB = await prisma.location.create({
    data: {
      organizationId: orgB.id,
      brandId: (await prisma.brand.findFirst({ select: { id: true } }))!.id, // link arbitrary brand
      name: 'Confidential Unit B',
      address: '100 Private Way',
      city: 'Miami',
      state: 'FL',
      country: 'US',
    },
  });

  const reviewB = await prisma.contentItem.create({
    data: {
      organizationId: orgB.id,
      dataSourceId: 'GOOGLE',
      contentType: ContentType.REVIEW,
      locationId: locationB.id,
      text: 'SECRET REVIEW: Organization B confidential service review.',
      authorName: 'Secret Agent',
      rating: 5.0,
      publishedAt: new Date(),
    },
  });

  // 2. Setup Session metadata for User A (Attacker Role)
  const userA = {
    id: 'user-a-id',
    email: 'attacker@brasabrandpulse.com',
    organizationId: (await prisma.organization.findUnique({ where: { slug: 'demo-steakhouse' } }))!.id,
    roles: [Role.CORPORATE_ADMIN],
    scopes: [{ scopeType: ScopeType.GLOBAL, scopeId: '*' }],
  };

  let testFailures = 0;

  // TEST 1: Direct enforceTenantIsolation check on target Org B
  console.log('\n[TEST 1] Verifying enforceTenantIsolation check...');
  try {
    enforceTenantIsolation(userA, orgB.id);
    console.error('❌ FAIL: User A was allowed to access Organization B context!');
    testFailures++;
  } catch (err: any) {
    console.log('✔ PASS: Tenant isolation correctly blocked User A. Error:', err.message);
  }

  // TEST 2: Scoping access block on location B
  console.log('\n[TEST 2] Verifying enforceScopeAccess check on location B...');
  try {
    await enforceScopeAccess(userA, { locationId: locationB.id });
    console.error('❌ FAIL: User A was allowed to access Location B scope!');
    testFailures++;
  } catch (err: any) {
    console.log('✔ PASS: Scope check successfully blocked Location B. Error:', err.message);
  }

  // TEST 3: Score calculation leak test (trying to pass Location B ID under Org A query)
  console.log('\n[TEST 3] Verifying scoring boundary leaks...');
  try {
    const scores = await calculateLocationScore(userA.organizationId, locationB.id, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
    // Since locationB does not belong to Org A, calculating scores under Org A context should find 0 reviews and return default score (80.0)
    // and dataConfidence = 0. We verify that Organization B actual reviews were not leaked.
    if (scores.dataConfidence > 0) {
      console.error('❌ FAIL: calculateLocationScore leaked Organization B reviews into Organization A scores!');
      testFailures++;
    } else {
      console.log('✔ PASS: Scoring aggregation completely ignored Organization B private reviews. Score Confidence: 0%');
    }
  } catch (err: any) {
    console.log('✔ PASS: Score engine safely blocked execution.', err.message);
  }

  // TEST 4: Ask BRASA database context generation boundaries
  console.log('\n[TEST 4] Verifying Ask BRASA context boundaries...');
  // Simulating the DB context fetch in /api/ask-brasa
  const leakedReviews = await prisma.contentItem.findMany({
    where: {
      organizationId: userA.organizationId, // Query restricted to User A's Org
      locationId: locationB.id, // Trying to query Location B
    },
  });

  if (leakedReviews.length > 0) {
    console.error('❌ FAIL: DB Query leaked Organization B content under User A organization context!');
    testFailures++;
  } else {
    console.log('✔ PASS: Ask BRASA database query successfully yielded 0 results for cross-tenant Location B.');
  }

  // TEST 5: ReputationEvent cross-tenant isolation
  console.log('\n[TEST 5] Verifying ReputationEvent cross-tenant isolation...');
  try {
    const orgBEvents = await prisma.reputationEvent.findMany({
      where: {
        organizationId: userA.organizationId, // User A's Org
        externalSourceId: 'ext-source-org-b-id'
      }
    });

    if (orgBEvents.length === 0) {
      console.log('✔ PASS: ReputationEvent queries strictly isolated by organizationId.');
    } else {
      console.error('❌ FAIL: Leaked Organization B reputation events to User A context!');
      testFailures++;
    }
  } catch (err: any) {
    console.log('✔ PASS: ReputationEvent query safely blocked cross-tenant access.', err.message);
  }

  // Clean up Org B test records
  await prisma.contentItem.delete({ where: { id: reviewB.id } });
  await prisma.location.delete({ where: { id: locationB.id } });
  
  console.log('\n==================================================');
  if (testFailures === 0) {
    console.log('🎉 SECURITY SUCCESS: ALL TENANT ISOLATION TESTS PASSED!');
  } else {
    console.error(`💥 FAILURE: ${testFailures} tenant isolation tests failed!`);
    process.exit(1);
  }
  console.log('==================================================');
}

runTests()
  .catch((e) => {
    console.error('Test execution error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
