import { PrismaClient, AcquisitionMethod, CoverageType, ContentType } from '@prisma/client';
import { getSourceCapabilities } from '../src/lib/connectors/scoutRegistry';
import { checkSourcePolicy, createExternalSource, createSnapshotIfChanged, recalculateDataCoverage, validateExternalSourceTarget } from '../src/lib/services/scoutService';
import { runProfileDiscovery } from '../src/lib/connectors/discoveryAgent';
import { fetchPublicMetadata, monitorSource } from '../src/lib/connectors/sourceMonitorAgent';
import { calculateLocationScore } from '../src/lib/scoring';

const prisma = new PrismaClient();

async function runTests() {
  console.log('==================================================');
  console.log('STARTING BRASA DATA SCOUT INTEGRATION TESTS');
  console.log('==================================================');

  let testFailures = 0;

  // Setup sandbox tenant contexts
  const orgA = await prisma.organization.upsert({
    where: { slug: 'scout-org-a' },
    update: {},
    create: { name: 'Data Scout Org A', slug: 'scout-org-a' }
  });

  const orgB = await prisma.organization.upsert({
    where: { slug: 'scout-org-b' },
    update: {},
    create: { name: 'Data Scout Org B', slug: 'scout-org-b' }
  });

  const brand = await prisma.brand.findFirst();
  const brandId = brand ? brand.id : (await prisma.brand.create({ data: { name: 'Scout Brand', organizationId: orgA.id } })).id;

  const locationA = await prisma.location.create({
    data: {
      organizationId: orgA.id,
      brandId,
      name: 'BRASA Tampa',
      address: '101 Meat Ave',
      city: 'Tampa',
      state: 'FL',
      country: 'US',
    }
  });

  const locationB = await prisma.location.create({
    data: {
      organizationId: orgB.id,
      brandId,
      name: 'BRASA Orlando',
      address: '202 Grill Way',
      city: 'Orlando',
      state: 'FL',
      country: 'US',
    }
  });

  // TEST 1: Source Registry Capabilities
  console.log('\n[TEST 1] Verifying Source Registry capabilities...');
  try {
    const googleCaps = getSourceCapabilities('GOOGLE');
    const yelpCaps = getSourceCapabilities('YELP');
    const otCaps = getSourceCapabilities('OPENTABLE');

    if (googleCaps.supportsDiscovery && yelpCaps.supportsPublicRating && otCaps.supportsAutomatedMonitoring) {
      console.log('✔ PASS: Source Registry returned valid capability flags.');
    } else {
      console.error('❌ FAIL: Capability flags mapping incorrect.');
      testFailures++;
    }
  } catch (e: any) {
    console.error('❌ FAIL: Source Registry error:', e.message);
    testFailures++;
  }

  // TEST 2: SourcePolicy Enforcement
  console.log('\n[TEST 2] Verifying SourcePolicy gating checks...');
  try {
    // Disable monitoring for YELP policy in DB
    await prisma.sourcePolicy.update({
      where: { provider: 'YELP' },
      data: { allowAutomatedMonitoring: false }
    });

    const isGoogleAllowed = await checkSourcePolicy('GOOGLE', 'allowAutomatedMonitoring');
    const isYelpAllowed = await checkSourcePolicy('YELP', 'allowAutomatedMonitoring');

    if (isGoogleAllowed && !isYelpAllowed) {
      console.log('✔ PASS: SourcePolicy successfully gated provider capabilities.');
    } else {
      console.error('❌ FAIL: SourcePolicy check returned invalid permissions.');
      testFailures++;
    }

    // Re-enable Yelp for subsequent tests
    await prisma.sourcePolicy.update({
      where: { provider: 'YELP' },
      data: { allowAutomatedMonitoring: true }
    });
  } catch (e: any) {
    console.error('❌ FAIL: SourcePolicy check error:', e.message);
    testFailures++;
  }

  // TEST 3: Duplicate ExternalSource Prevention
  console.log('\n[TEST 3] Verifying duplicate ExternalSource prevention...');
  try {
    const src1 = await createExternalSource({
      organizationId: orgA.id,
      locationId: locationA.id,
      provider: 'GOOGLE',
      sourceUrl: 'https://maps.google.com/?cid=123',
    });

    const src2 = await createExternalSource({
      organizationId: orgA.id,
      locationId: locationA.id,
      provider: 'GOOGLE',
      sourceUrl: 'https://maps.google.com/?cid=123-dup',
    });

    if (src1.id === src2.id) {
      console.log('✔ PASS: Successfully prevented duplicate ExternalSource profile registration.');
    } else {
      console.error('❌ FAIL: Allowed duplicate provider registrations on same location.');
      testFailures++;
    }
  } catch (e: any) {
    console.error('❌ FAIL: Duplicate prevention error:', e.message);
    testFailures++;
  }

  // TEST 4: Exclusive target validation (locationId OR competitorLocationId)
  console.log('\n[TEST 4] Verifying exclusive target validation...');
  try {
    validateExternalSourceTarget(locationA.id, null); // Ok
    validateExternalSourceTarget(null, 'competitor-id'); // Ok
    console.log('✔ PASS: Valid targets successfully validated.');
  } catch (e: any) {
    console.error('❌ FAIL: Valid targets rejected:', e.message);
    testFailures++;
  }

  try {
    validateExternalSourceTarget(locationA.id, 'competitor-id');
    console.error('❌ FAIL: Allowed assigning both locationId and competitorLocationId.');
    testFailures++;
  } catch (e: any) {
    console.log('✔ PASS: Correctly blocked assigning both targets.');
  }

  try {
    validateExternalSourceTarget(null, null);
    console.error('❌ FAIL: Allowed assigning zero targets.');
    testFailures++;
  } catch (e: any) {
    console.log('✔ PASS: Correctly blocked assigning zero targets.');
  }

  // TEST 5: Snapshot Delta Detection and Immutability
  console.log('\n[TEST 5] Verifying snapshot delta detection...');
  try {
    const src = await prisma.externalSource.findFirst({
      where: { locationId: locationA.id, provider: 'GOOGLE' }
    });

    if (!src) throw new Error('External source not found for Tampa');

    // Create first snapshot
    const run1 = await createSnapshotIfChanged(src.id, {
      rating: 4.7,
      reviewCount: 2450,
      acquisitionMethod: AcquisitionMethod.PUBLIC_METADATA,
      coverageType: CoverageType.METADATA_ONLY
    });

    // Create second snapshot with IDENTICAL data
    const run2 = await createSnapshotIfChanged(src.id, {
      rating: 4.7,
      reviewCount: 2450,
      acquisitionMethod: AcquisitionMethod.PUBLIC_METADATA,
      coverageType: CoverageType.METADATA_ONLY
    });

    // Create third snapshot with CHANGED data
    const run3 = await createSnapshotIfChanged(src.id, {
      rating: 4.6,
      reviewCount: 2455,
      acquisitionMethod: AcquisitionMethod.PUBLIC_METADATA,
      coverageType: CoverageType.METADATA_ONLY
    });

    if (run1.snapshot && !run2.snapshot && run3.snapshot) {
      console.log('✔ PASS: Delta checker wrote snapshots only upon changes.');
      if (run3.changeEvents.includes('RATING_CHANGED') && run3.changeEvents.includes('REVIEW_COUNT_CHANGED')) {
        console.log('✔ PASS: Snapshot change events raised correctly.');
      } else {
        console.error('❌ FAIL: Incorrect change events raised:', run3.changeEvents);
        testFailures++;
      }
    } else {
      console.error('❌ FAIL: Snapshots delta detection logic failed to bypass duplicate writes.');
      testFailures++;
    }
  } catch (e: any) {
    console.error('❌ FAIL: Snapshot delta error:', e.message);
    testFailures++;
  }

  // TEST 6: Data Coverage calculation logic
  console.log('\n[TEST 6] Verifying DataCoverage calculations...');
  try {
    // 1. Initially metadata-only (Tampa Google)
    await recalculateDataCoverage(orgA.id, locationA.id, null, 'GOOGLE');
    let cov = await prisma.dataCoverage.findFirst({
      where: { locationId: locationA.id, provider: 'GOOGLE' }
    });
    
    if (cov && cov.coverageType === CoverageType.METADATA_ONLY) {
      console.log('✔ PASS: Coverage correctly resolved to METADATA_ONLY.');
    } else {
      console.error('❌ FAIL: Expected METADATA_ONLY, got:', cov?.coverageType);
      testFailures++;
    }

    // 2. Add partial reviews
    await prisma.contentItem.create({
      data: {
        organizationId: orgA.id,
        dataSourceId: 'GOOGLE',
        contentType: ContentType.REVIEW,
        locationId: locationA.id,
        authorName: 'Reviewer 1',
        text: 'Tasty steak!',
        rating: 5,
        publishedAt: new Date(),
        coverageType: CoverageType.PARTIAL,
      }
    });

    await recalculateDataCoverage(orgA.id, locationA.id, null, 'GOOGLE');
    cov = await prisma.dataCoverage.findFirst({
      where: { locationId: locationA.id, provider: 'GOOGLE' }
    });

  // TEST 9: Monitoring Eligibility Checks
  console.log('\n[TEST 9] Verifying Monitoring Eligibility checks...');
  try {
    const { checkMonitoringEligibility } = await import('../src/lib/connectors/scoutMonitoringAgent');
    const src = await prisma.externalSource.findFirst({
      where: { locationId: locationA.id, provider: 'GOOGLE' }
    });

    if (src) {
      // Unconfirmed source check
      await prisma.externalSource.update({ where: { id: src.id }, data: { status: 'DISCOVERED' } });
      const el1 = await checkMonitoringEligibility(src.id);

      // Restore to CONFIRMED with Place ID
      await prisma.externalSource.update({
        where: { id: src.id },
        data: { status: 'CONFIRMED', externalLocationId: 'ChIJHdigC67DwogRkWjPRn8SUbQ' }
      });
      const el2 = await checkMonitoringEligibility(src.id);

      if (!el1.eligible && el1.reason === 'SOURCE_NOT_CONFIRMED' && el2.eligible) {
        console.log('✔ PASS: Monitoring eligibility correctly gated unconfirmed profiles.');
      } else {
        console.error('❌ FAIL: Eligibility check failed:', el1, el2);
        testFailures++;
      }
    }
  } catch (e: any) {
    console.error('❌ FAIL: Eligibility check error:', e.message);
    testFailures++;
  }

  // TEST 10: Review Velocity & Rating Trend Engine
  console.log('\n[TEST 10] Verifying Review Velocity & Rating Trend calculation engine...');
  try {
    const { calculateReviewVelocity, calculateRatingTrend } = await import('../src/lib/scout/reputationEngine');

    const emptyVelocity = calculateReviewVelocity([]);
    const emptyTrend = calculateRatingTrend([]);

    if (emptyVelocity.direction === 'INSUFFICIENT_DATA' && emptyTrend.direction === 'INSUFFICIENT_DATA') {
      console.log('✔ PASS: Velocity and Trend engines correctly reported INSUFFICIENT_DATA for empty history.');
    } else {
      console.error('❌ FAIL: Expected INSUFFICIENT_DATA, got:', emptyVelocity.direction, emptyTrend.direction);
      testFailures++;
    }
  } catch (e: any) {
    console.error('❌ FAIL: Velocity engine error:', e.message);
    testFailures++;
  }

    // 3. Mark complete reviews
    await prisma.contentItem.create({
      data: {
        organizationId: orgA.id,
        dataSourceId: 'GOOGLE',
        contentType: ContentType.REVIEW,
        locationId: locationA.id,
        authorName: 'Reviewer 2',
        text: 'Nice service!',
        rating: 4,
        publishedAt: new Date(),
        coverageType: CoverageType.COMPLETE,
      }
    });

    await recalculateDataCoverage(orgA.id, locationA.id, null, 'GOOGLE');
    cov = await prisma.dataCoverage.findFirst({
      where: { locationId: locationA.id, provider: 'GOOGLE' }
    });

    if (cov && cov.coverageType === CoverageType.COMPLETE) {
      console.log('✔ PASS: Coverage correctly resolved to COMPLETE.');
    } else {
      console.error('❌ FAIL: Expected COMPLETE, got:', cov?.coverageType);
      testFailures++;
    }
  } catch (e: any) {
    console.error('❌ FAIL: Coverage calculation error:', e.message);
    testFailures++;
  }

  // TEST 7: Analytics safeguards (SAMPLE/METADATA_ONLY shouldn't render score components)
  console.log('\n[TEST 7] Verifying data coverage analytics safeguards...');
  try {
    // Set location B coverage explicitly to METADATA_ONLY
    await prisma.dataCoverage.create({
      data: {
        organizationId: orgB.id,
        locationId: locationB.id,
        provider: 'GOOGLE',
        coverageType: CoverageType.METADATA_ONLY,
      }
    });

    // Write a review for Location B (simulate sample)
    await prisma.contentItem.create({
      data: {
        organizationId: orgB.id,
        dataSourceId: 'GOOGLE',
        contentType: ContentType.REVIEW,
        locationId: locationB.id,
        authorName: 'Spy',
        text: 'Hidden review',
        rating: 5,
        publishedAt: new Date(),
        provenanceMode: 'LIVE',
        coverageType: CoverageType.SAMPLE
      }
    });

    // Run score calculations
    const score = await calculateLocationScore(orgB.id, locationB.id, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
    
    if (score.reputation === null && score.sentiment === null && score.brandPulse === null && score.dataConfidence === 0.0) {
      console.log('✔ PASS: Safely returned null/insufficient_data for METADATA_ONLY coverage.');
    } else {
      console.error('❌ FAIL: Scores generated despite insufficient data coverage rules:', score);
      testFailures++;
    }
  } catch (e: any) {
    console.error('❌ FAIL: Safeguards verification error:', e.message);
    testFailures++;
  }

  // TEST 8: Google Places Adapter
  console.log('\n[TEST 8] Verifying Google Places Adapter...');
  try {
    const { GooglePlacesAdapter } = require('../src/lib/scout/adapters/googlePlacesAdapter');
    const adapter = new GooglePlacesAdapter();
    const status = adapter.getAdapterStatus();
    console.log(`Google Places Adapter Status: ${status}`);

    if (status === 'NOT_CONFIGURED') {
      console.log('✔ PASS: Properly reported NOT_CONFIGURED when API key is missing.');
      try {
        await adapter.discoverPlaces('Texas de Brazil Tampa');
        console.error('❌ FAIL: Allowed discovery call without API key.');
        testFailures++;
      } catch (err: any) {
        if (err.message.includes('GOOGLE_PLACES_NOT_CONFIGURED')) {
          console.log('✔ PASS: Correctly threw GOOGLE_PLACES_NOT_CONFIGURED.');
        } else {
          console.error('❌ FAIL: Threw incorrect error:', err.message);
          testFailures++;
        }
      }
    } else {
      console.log('✔ INFO: Google Places API Key is configured. Running live check...');
      try {
        const candidates = await adapter.discoverPlaces('Texas de Brazil Tampa');
        console.log(`Discovered ${candidates.length} candidates.`);
        if (candidates.length > 0) {
          const first = candidates[0];
          console.log(`Candidate Name: ${first.displayName}, Place ID: ${first.id}`);
          if (first.id) {
            console.log('✔ PASS: Found real Google Place ID.');
            const details = await adapter.getPlaceDetails(first.id);
            console.log(`Details Name: ${details.displayName}, Rating: ${details.rating}, Reviews: ${details.userRatingCount}`);
            if (details.rating !== undefined && details.userRatingCount !== undefined) {
              console.log('✔ PASS: Successfully fetched real rating and review count.');
            }
          }
        }
      } catch (err: any) {
        console.error('❌ FAIL: Live Google Places call failed:', err.message);
        testFailures++;
      }
    }
  } catch (e: any) {
    console.error('❌ FAIL: Google Places Adapter test error:', e.message);
    testFailures++;
  }

  // Clean up sandbox records
  console.log('\nCleaning up sandbox test entries...');
  try {
    await prisma.dataCoverage.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
    await prisma.sourceSnapshot.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
    await prisma.externalSource.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
    await prisma.contentItem.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
    await prisma.location.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
    console.log('✔ Cleanup complete.');
  } catch (e: any) {
    console.error('Cleanup warning:', e.message);
  }

  console.log('\n==================================================');
  if (testFailures === 0) {
    console.log('ALL SCOUT VERIFICATION TESTS COMPLETED SUCCESSFULLY! PASS');
  } else {
    console.error(`COMPLETED TESTS WITH ${testFailures} FAILURES.`);
    process.exit(1);
  }
  console.log('==================================================');
}

runTests()
  .catch((e) => {
    console.error('Test execution crash:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
