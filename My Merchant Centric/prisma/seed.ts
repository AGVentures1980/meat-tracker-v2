import { PrismaClient, Role, ScopeType, SentimentValue, Severity, CaseStatus, ContentType, ProcessingStatus, AlertStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // 1. Create Organization
  const org = await prisma.organization.create({
    data: {
      name: 'Demo Brazilian Steakhouse Group',
      slug: 'demo-steakhouse',
      status: 'ACTIVE',
      timezone: 'America/New_York',
      defaultLanguage: 'en',
    },
  });

  // 2. Create Brand
  const brand = await prisma.brand.create({
    data: {
      organizationId: org.id,
      name: 'BRASA Grill',
      website: 'https://demo.brasagrill.com',
      description: 'Upscale authentic Brazilian Steakhouse serving premium cuts.',
    },
  });

  // 3. Create Hierarchies (Division -> Region -> District)
  const division = await prisma.division.create({
    data: {
      organizationId: org.id,
      name: 'Southeast Division',
    },
  });

  const region = await prisma.region.create({
    data: {
      organizationId: org.id,
      divisionId: division.id,
      name: 'Florida Region',
    },
  });

  const district = await prisma.district.create({
    data: {
      organizationId: org.id,
      regionId: region.id,
      name: 'Central-South District',
    },
  });

  // 4. Create Locations
  const locationsData = [
    { name: 'BRASA Tampa', city: 'Tampa', state: 'FL', address: '401 E Jackson St', lat: 27.9472, lng: -82.4554 },
    { name: 'BRASA Miami', city: 'Miami', state: 'FL', address: '801 Brickell Ave', lat: 25.7656, lng: -80.1925 },
    { name: 'BRASA Fort Lauderdale', city: 'Fort Lauderdale', state: 'FL', address: '200 E Las Olas Blvd', lat: 26.1194, lng: -80.1408 },
    { name: 'BRASA Orlando', city: 'Orlando', state: 'FL', address: '8000 International Dr', lat: 28.4502, lng: -81.4705 },
    { name: 'BRASA Jacksonville', city: 'Jacksonville', state: 'FL', address: '245 Riverside Ave', lat: 30.3204, lng: -81.6744 },
  ];

  const locations: any[] = [];
  for (const loc of locationsData) {
    const created = await prisma.location.create({
      data: {
        organizationId: org.id,
        divisionId: division.id,
        regionId: region.id,
        districtId: district.id,
        brandId: brand.id,
        name: loc.name,
        address: loc.address,
        city: loc.city,
        state: loc.state,
        country: 'US',
        latitude: loc.lat,
        longitude: loc.lng,
        timezone: 'America/New_York',
        status: 'ACTIVE',
      },
    });
    locations.push(created);
  }

  const [tampa, miami, ftLauderdale, orlando, jacksonville] = locations;

  // 5. Create Users (with hashed passwords)
  const passwordHash = await bcrypt.hash('password123', 10);

  const corpAdmin = await prisma.user.create({
    data: {
      organizationId: org.id,
      firstName: 'Alexandre',
      lastName: 'Garcia',
      email: 'admin@brasabrandpulse.com',
      passwordHash,
      status: 'ACTIVE',
      timezone: 'America/New_York',
      roles: {
        create: { role: Role.CORPORATE_ADMIN },
      },
      scopes: {
        create: { scopeType: ScopeType.GLOBAL, scopeId: '*' },
      },
    },
  });

  const flDirector = await prisma.user.create({
    data: {
      organizationId: org.id,
      firstName: 'Angela',
      lastName: 'Carvalho',
      email: 'florida_director@brasabrandpulse.com',
      passwordHash,
      status: 'ACTIVE',
      timezone: 'America/New_York',
      roles: {
        create: { role: Role.DIRECTOR },
      },
      scopes: {
        create: { scopeType: ScopeType.REGION, scopeId: region.id },
      },
    },
  });

  const tampaGM = await prisma.user.create({
    data: {
      organizationId: org.id,
      firstName: 'Mike',
      lastName: 'GM',
      email: 'tampa_gm@brasabrandpulse.com',
      passwordHash,
      status: 'ACTIVE',
      timezone: 'America/New_York',
      roles: {
        create: { role: Role.GENERAL_MANAGER },
      },
      scopes: {
        create: { scopeType: ScopeType.LOCATION, scopeId: tampa.id },
      },
    },
  });

  // 6. Scoring Configurations
  await prisma.scoringConfiguration.create({
    data: {
      organizationId: org.id,
      scoringVersion: '1.0',
      reputationWeight: 0.35,
      sentimentWeight: 0.25,
      competitiveWeight: 0.15,
      momentumWeight: 0.10,
      responseWeight: 0.10,
      recoveryWeight: 0.05,
    },
  });

  // 7. System Segments (Global)
  const segmentRoot = await prisma.restaurantSegment.create({
    data: { name: 'Full Service', level: 0 },
  });

  const segmentSteakhouse = await prisma.restaurantSegment.create({
    data: { parentSegmentId: segmentRoot.id, name: 'Steakhouse', level: 1 },
  });

  const segmentBrazilian = await prisma.restaurantSegment.create({
    data: { parentSegmentId: segmentSteakhouse.id, name: 'Brazilian Steakhouse', level: 2 },
  });

  const segmentQsr = await prisma.restaurantSegment.create({
    data: { name: 'Quick Service Restaurant', level: 0 },
  });

  // Classify locations
  for (const loc of locations) {
    await prisma.locationClassification.create({
      data: {
        locationId: loc.id,
        primarySegmentId: segmentBrazilian.id,
        cuisineType: 'Brazilian / Churrascaria',
        serviceModel: 'Fine Dining / Rodizio',
        priceTier: 'Premium ($$$$)',
        occasionType: 'Celebration / Business',
      },
    });
  }

  // 8. Competitors (Global system competitors and custom organization competitors)
  const compBrand1 = await prisma.competitorBrand.create({
    data: {
      name: 'Fogo de Chão',
      website: 'https://fogodechao.com',
      primarySegmentId: segmentBrazilian.id,
    },
  });

  const compBrand2 = await prisma.competitorBrand.create({
    data: {
      name: 'Texas de Brazil',
      website: 'https://texasdebrazil.com',
      primarySegmentId: segmentBrazilian.id,
    },
  });

  const competitorLocationsData = [
    { brandId: compBrand1.id, name: 'Fogo de Chão Tampa', city: 'Tampa', address: '3014 W Boy Scout Blvd', priceTier: 'Premium ($$$$)', serviceModel: 'Rodizio' },
    { brandId: compBrand1.id, name: 'Fogo de Chão Miami', city: 'Miami', address: '836 1st St', priceTier: 'Premium ($$$$)', serviceModel: 'Rodizio' },
    { brandId: compBrand2.id, name: 'Texas de Brazil Tampa', city: 'Tampa', address: '2525 N Westshore Blvd', priceTier: 'Premium ($$$$)', serviceModel: 'Rodizio' },
    { brandId: compBrand2.id, name: 'Texas de Brazil Orlando', city: 'Orlando', address: '5259 International Dr', priceTier: 'Premium ($$$$)', serviceModel: 'Rodizio' },
  ];

  const competitors: any[] = [];
  for (const comp of competitorLocationsData) {
    const created = await prisma.competitorLocation.create({
      data: {
        competitorBrandId: comp.brandId,
        name: comp.name,
        address: comp.address,
        city: comp.city,
        state: 'FL',
        country: 'US',
        priceTier: comp.priceTier,
        serviceModel: comp.serviceModel,
      },
    });
    competitors.push(created);
  }

  const [fogoTampa, fogoMiami, texasTampa, texasOrlando] = competitors;

  // 9. Competitive Sets Configuration
  const tampaCompSet = await prisma.competitiveSet.create({
    data: {
      organizationId: org.id,
      locationId: tampa.id,
      name: 'Tampa Core Competitive Set',
      createdBy: corpAdmin.id,
      status: 'ACTIVE',
      approvedBy: corpAdmin.id,
      approvedAt: new Date(),
    },
  });

  await prisma.competitiveSetMember.createMany({
    data: [
      { competitiveSetId: tampaCompSet.id, competitorLocationId: fogoTampa.id, matchScore: 98.0, tier: 'DIRECT', status: 'APPROVED', suggestedByAI: true, approvedByUser: true },
      { competitiveSetId: tampaCompSet.id, competitorLocationId: texasTampa.id, matchScore: 95.0, tier: 'DIRECT', status: 'APPROVED', suggestedByAI: true, approvedByUser: true },
    ],
  });

  const miamiCompSet = await prisma.competitiveSet.create({
    data: {
      organizationId: org.id,
      locationId: miami.id,
      name: 'Miami Beach Competitive Set',
      createdBy: corpAdmin.id,
      status: 'ACTIVE',
      approvedBy: corpAdmin.id,
      approvedAt: new Date(),
    },
  });

  await prisma.competitiveSetMember.createMany({
    data: [
      { competitiveSetId: miamiCompSet.id, competitorLocationId: fogoMiami.id, matchScore: 99.0, tier: 'DIRECT', status: 'APPROVED', suggestedByAI: true, approvedByUser: true },
    ],
  });

  // 10. Data Sources Setup
  const dataSourcesData = [
    { id: 'GOOGLE', name: 'Google Business Profile', type: 'GOOGLE', supportsReviews: true, supportsResponses: true },
    { id: 'YELP', name: 'Yelp Business', type: 'YELP', supportsReviews: true, supportsResponses: true },
    { id: 'TRIPADVISOR', name: 'Tripadvisor Restaurant', type: 'TRIPADVISOR', supportsReviews: true },
    { id: 'TIKTOK', name: 'TikTok Video Sync', type: 'TIKTOK', supportsSocial: true },
    { id: 'INSTAGRAM', name: 'Instagram Media Monitor', type: 'INSTAGRAM', supportsSocial: true },
    { id: 'REDDIT', name: 'Reddit Listening', type: 'REDDIT', supportsSocial: true },
    { id: 'X', name: 'X / Twitter mentions', type: 'X', supportsSocial: true },
    { id: 'CSV', name: 'CSV File Ingestion', type: 'CSV', supportsReviews: true },
    { id: 'MANUAL', name: 'Manual Input Ingest', type: 'MANUAL', supportsReviews: true },
  ];

  for (const ds of dataSourcesData) {
    await prisma.dataSource.upsert({
      where: { id: ds.id },
      update: {},
      create: {
        id: ds.id,
        name: ds.name,
        sourceType: ds.type,
        supportsReviews: ds.supportsReviews,
        supportsSocial: ds.supportsSocial,
        supportsResponses: ds.supportsResponses,
      },
    });
  }

  // 11. Topics Registry
  const topicsData = [
    { id: 'FOOD', name: 'Food & Beverage', desc: 'Main category for food and beverages' },
    { id: 'FOOD_QUALITY', name: 'Food Quality', desc: 'Standard of ingredients and presentation', parent: 'FOOD' },
    { id: 'FOOD_TEMPERATURE', name: 'Food Temperature', desc: 'Correct serving temperature', parent: 'FOOD' },
    { id: 'FOOD_PREPARATION', name: 'Food Preparation', desc: 'Cooking levels, tenderness, doneness', parent: 'FOOD' },
    
    { id: 'SERVICE', name: 'Service Quality', desc: 'Service execution and guest relation' },
    { id: 'SERVICE_ATTENTIVENESS', name: 'Attentiveness', desc: 'Staff presence and responsiveness', parent: 'SERVICE' },
    { id: 'SERVICE_FRIENDLINESS', name: 'Friendliness', desc: 'Staff attitude and warmth', parent: 'SERVICE' },
    { id: 'SERVICE_SPEED', name: 'Speed of Service', desc: 'Food delivery time, billing speed', parent: 'SERVICE' },
    
    { id: 'VALUE', name: 'Value', desc: 'Value for money perceptions' },
    { id: 'ATMOSPHERE', name: 'Atmosphere & Vibe', desc: 'Music, decor, noise, and lighting' },
    { id: 'WAIT_TIME', name: 'Wait Times', desc: 'Host stand wait list, reservation delays' },
    { id: 'CLEANLINESS', name: 'Cleanliness', desc: 'Tables, restrooms, dining room cleanliness' },
  ];

  for (const tp of topicsData) {
    await prisma.topic.upsert({
      where: { id: tp.id },
      update: {},
      create: {
        id: tp.id,
        name: tp.name,
        description: tp.desc,
        parentTopicId: tp.parent || null,
      },
    });
  }

  // 12. Menu Dictionary Setup
  const menuItemsData = [
    { name: 'Picanha', category: 'MEAT', aliases: ['Top Sirloin Cap', 'Sirloin Cap', 'Brazilian Picanha'] },
    { name: 'Filet Mignon', category: 'MEAT', aliases: ['Tenderloin', 'Beef Tenderloin'] },
    { name: 'Salad Bar', category: 'SIDE', aliases: ['Market Table', 'Feijoada', 'Salad Table'] },
    { name: 'Lamb Chops', category: 'MEAT', aliases: ['Cordeiro', 'Lamb'] },
    { name: 'Fraldinha', category: 'MEAT', aliases: ['Flank Steak', 'Bottom Sirloin'] },
  ];

  const menuItems: any[] = [];
  for (const mi of menuItemsData) {
    const item = await prisma.menuItem.create({
      data: {
        organizationId: org.id,
        brandId: brand.id,
        name: mi.name,
        category: mi.category,
        active: true,
      },
    });
    
    for (const alias of mi.aliases) {
      await prisma.menuItemAlias.create({
        data: {
          menuItemId: item.id,
          alias,
          verified: true,
        },
      });
    }
    menuItems.push(item);
  }

  const [picanhaItem, filetItem, saladBarItem, lambItem] = menuItems;

  // 13. Employees & Praise Setup
  const employeesData = [
    { firstName: 'Maria', lastName: 'Silva', displayName: 'Maria S.', role: 'Server', locationId: tampa.id },
    { firstName: 'Mike', lastName: 'GM', displayName: 'Mike GM', role: 'General Manager', locationId: tampa.id },
    { firstName: 'Fabio', lastName: 'Souza', displayName: 'Chef Fabio', role: 'Head Carver', locationId: tampa.id },
    { firstName: 'Carlos', lastName: 'Lima', displayName: 'Carlos L.', role: 'Server', locationId: miami.id },
  ];

  const employees: any[] = [];
  for (const emp of employeesData) {
    const created = await prisma.employee.create({
      data: {
        organizationId: org.id,
        locationId: emp.locationId,
        firstName: emp.firstName,
        lastName: emp.lastName,
        displayName: emp.displayName,
        roleName: emp.role,
        active: true,
      },
    });
    
    await prisma.employeeAlias.create({
      data: {
        employeeId: created.id,
        alias: emp.firstName,
      },
    });
    employees.push(created);
  }

  const [mariaStaff, mikeStaff, fabioStaff, carlosStaff] = employees;

  // Set Manager Tenure
  await prisma.managerAssignment.create({
    data: {
      employeeId: mikeStaff.id,
      locationId: tampa.id,
      role: 'GENERAL_MANAGER',
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
    },
  });

  // 14. Content Items (Ingested Reviews and Social Posts)
  const publishedDate = new Date();

  // Test Review Case: "Maria was amazing but the filet was dry and took forever to arrive."
  const reviewTest = await prisma.contentItem.create({
    data: {
      organizationId: org.id,
      dataSourceId: 'GOOGLE',
      contentType: ContentType.REVIEW,
      locationId: tampa.id,
      authorName: 'Robert Vance',
      text: 'Maria was amazing but the filet was dry and took forever to arrive.',
      rating: 3.0,
      publishedAt: new Date(publishedDate.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      processingStatus: ProcessingStatus.SCORED,
    },
  });

  // Procesed Heuristics for Test Review
  await prisma.sentimentAnalysis.create({
    data: {
      contentItemId: reviewTest.id,
      overallSentiment: SentimentValue.MIXED,
      positiveScore: 0.45,
      neutralScore: 0.10,
      negativeScore: 0.45,
      confidence: 0.96,
      modelVersion: '1.0',
    },
  });

  await prisma.topicMention.createMany({
    data: [
      { contentItemId: reviewTest.id, topicId: 'SERVICE_ATTENTIVENESS', sentiment: SentimentValue.POSITIVE, confidence: 0.95, evidenceText: 'Maria was amazing', taxonomyVersion: '1.0' },
      { contentItemId: reviewTest.id, topicId: 'WAIT_TIME', sentiment: SentimentValue.NEGATIVE, confidence: 0.91, evidenceText: 'took forever to arrive', taxonomyVersion: '1.0' },
    ],
  });

  await prisma.menuMention.create({
    data: {
      contentItemId: reviewTest.id,
      menuItemId: filetItem.id,
      sentiment: SentimentValue.NEGATIVE,
      confidence: 0.93,
      attribute: 'DRY',
      evidenceText: 'the filet was dry',
    },
  });

  await prisma.employeeMention.create({
    data: {
      contentItemId: reviewTest.id,
      employeeId: mariaStaff.id,
      rawName: 'Maria',
      sentiment: SentimentValue.POSITIVE,
      confidence: 0.88,
      verified: true,
      evidenceText: 'Maria was amazing',
    },
  });

  // Open Recovery Case automatically for test review
  const recoveryCaseTest = await prisma.recoveryCase.create({
    data: {
      organizationId: org.id,
      locationId: tampa.id,
      contentItemId: reviewTest.id,
      severity: Severity.MEDIUM,
      status: CaseStatus.OPEN,
      openedAt: new Date(publishedDate.getTime() - 2 * 24 * 60 * 60 * 1000),
      dueAt: new Date(publishedDate.getTime() - (2 * 24 * 60 * 60 * 1000) + 12 * 60 * 60 * 1000), // 12h SLA
    },
  });

  await prisma.recoveryActivity.create({
    data: {
      recoveryCaseId: recoveryCaseTest.id,
      type: 'STATUS_CHANGE',
      description: 'System automatically opened recovery case due to MIXED overall sentiment on review.',
    },
  });

  // Reviews for Orlando (to trigger Negative Review Spike and low scores)
  const orlandoReviews = [
    'The wait time was awful. 45 minutes past our reservation time.',
    'Horrible service, food came out completely cold and the wait was ridiculous.',
    'Wait was over an hour and the salad bar was empty.',
  ];

  for (let i = 0; i < orlandoReviews.length; i++) {
    const text = orlandoReviews[i];
    const createdReview = await prisma.contentItem.create({
      data: {
        organizationId: org.id,
        dataSourceId: 'YELP',
        contentType: ContentType.REVIEW,
        locationId: orlando.id,
        authorName: `Unsatisfied Guest ${i}`,
        text,
        rating: 1.0,
        publishedAt: new Date(publishedDate.getTime() - i * 4 * 60 * 60 * 1000), // within past 24 hours
        processingStatus: ProcessingStatus.SCORED,
      },
    });

    await prisma.sentimentAnalysis.create({
      data: {
        contentItemId: createdReview.id,
        overallSentiment: SentimentValue.NEGATIVE,
        positiveScore: 0.05,
        neutralScore: 0.05,
        negativeScore: 0.90,
        confidence: 0.98,
        modelVersion: '1.0',
      },
    });

    await prisma.topicMention.create({
      data: {
        contentItemId: createdReview.id,
        topicId: 'WAIT_TIME',
        sentiment: SentimentValue.NEGATIVE,
        confidence: 0.95,
        evidenceText: text,
        taxonomyVersion: '1.0',
      },
    });

    // Create critical alerts for Orlando spike
    if (i === 0) {
      const alert = await prisma.alert.create({
        data: {
          organizationId: org.id,
          locationId: orlando.id,
          alertType: 'NEGATIVE_REVIEW_SPIKE',
          severity: Severity.CRITICAL,
          title: 'Wait Time Negative Review Spike in Orlando',
          description: '3 negative reviews within 12 hours regarding wait times.',
        },
      });

      await prisma.alertEvidence.create({
        data: {
          alertId: alert.id,
          contentItemId: createdReview.id,
        },
      });
    }
  }

  // Positive Sirloin praise for Miami
  const reviewMiami = await prisma.contentItem.create({
    data: {
      organizationId: org.id,
      dataSourceId: 'GOOGLE',
      contentType: ContentType.REVIEW,
      locationId: miami.id,
      authorName: 'Lucia Alvarez',
      text: 'Specatular dining! The Picanha was extremely flavorful and tender. Carlos provided outstanding service.',
      rating: 5.0,
      publishedAt: new Date(publishedDate.getTime() - 1 * 24 * 60 * 60 * 1000),
      processingStatus: ProcessingStatus.SCORED,
    },
  });

  await prisma.sentimentAnalysis.create({
    data: {
      contentItemId: reviewMiami.id,
      overallSentiment: SentimentValue.POSITIVE,
      positiveScore: 0.95,
      neutralScore: 0.05,
      negativeScore: 0.00,
      confidence: 0.98,
      modelVersion: '1.0',
    },
  });

  await prisma.menuMention.create({
    data: {
      contentItemId: reviewMiami.id,
      menuItemId: picanhaItem.id,
      sentiment: SentimentValue.POSITIVE,
      confidence: 0.97,
      attribute: 'TENDER',
      evidenceText: 'Picanha was extremely flavorful and tender',
    },
  });

  await prisma.employeeMention.create({
    data: {
      contentItemId: reviewMiami.id,
      employeeId: carlosStaff.id,
      rawName: 'Carlos',
      sentiment: SentimentValue.POSITIVE,
      confidence: 0.94,
      verified: true,
    },
  });

  // Viral negative post on TikTok for Tampa
  const tiktokPost = await prisma.contentItem.create({
    data: {
      organizationId: org.id,
      dataSourceId: 'TIKTOK',
      contentType: ContentType.SOCIAL_POST,
      locationId: tampa.id,
      authorName: '@foodie_adventures',
      title: 'Wait time disaster at BRASA Grill Tampa!',
      text: 'Do not go to BRASA Grill Tampa. We waited forever for food, the steak was dry, and management did not care.',
      publishedAt: new Date(publishedDate.getTime() - 3 * 24 * 60 * 60 * 1000),
      processingStatus: ProcessingStatus.SCORED,
    },
  });

  await prisma.sentimentAnalysis.create({
    data: {
      contentItemId: tiktokPost.id,
      overallSentiment: SentimentValue.NEGATIVE,
      positiveScore: 0.05,
      neutralScore: 0.10,
      negativeScore: 0.85,
      confidence: 0.94,
      modelVersion: '1.0',
    },
  });

  await prisma.contentMetricSnapshot.create({
    data: {
      contentItemId: tiktokPost.id,
      views: 125000,
      likes: 8500,
      comments: 650,
      shares: 1200,
    },
  });

  const viralAlert = await prisma.alert.create({
    data: {
      organizationId: org.id,
      locationId: tampa.id,
      alertType: 'VIRAL_RISK',
      severity: Severity.HIGH,
      title: 'Viral Social Risk Detected - TikTok',
      description: 'Video by @foodie_adventures criticizing Tampa wait times has exceeded 100k views.',
    },
  });

  await prisma.alertEvidence.create({
    data: {
      alertId: viralAlert.id,
      contentItemId: tiktokPost.id,
    },
  });

  // 15. Create Historical Score Snapshots
  const snapshotDate = new Date();
  const scoreTypes = ['BRAND_PULSE', 'REPUTATION', 'SENTIMENT', 'COMPETITIVE', 'MOMENTUM', 'RESPONSE', 'RECOVERY'];
  const locationsList = [tampa, miami, ftLauderdale, orlando, jacksonville];
  const locationBaseScores: Record<string, number> = {
    [tampa.id]: 91.2,
    [miami.id]: 94.7,
    [ftLauderdale.id]: 88.4,
    [orlando.id]: 69.8,
    [jacksonville.id]: 82.5,
  };

  for (const loc of locationsList) {
    const baseScore = locationBaseScores[loc.id];
    for (const type of scoreTypes) {
      let scoreVal = baseScore;
      if (type === 'REPUTATION') scoreVal += 1.5;
      if (type === 'SENTIMENT') scoreVal += 2.0;
      if (loc.id === orlando.id && type === 'BRAND_PULSE') scoreVal = 69.8; // explicitly low

      await prisma.scoreSnapshot.create({
        data: {
          organizationId: org.id,
          locationId: loc.id,
          scoreType: type,
          periodStart: new Date(snapshotDate.getTime() - 30 * 24 * 60 * 60 * 1000),
          periodEnd: snapshotDate,
          score: scoreVal,
          previousScore: scoreVal + (loc.id === orlando.id ? 8.5 : -2.5),
          delta: loc.id === orlando.id ? -8.5 : 2.5,
          algorithmVersion: '1.0',
          dataConfidence: 0.95,
        },
      });
    }
  }

  // 16. Seed Rankings
  let rank = 1;
  const rankedLocs = [miami, tampa, ftLauderdale, jacksonville, orlando];
  for (const loc of rankedLocs) {
    await prisma.rankingSnapshot.create({
      data: {
        organizationId: org.id,
        scopeType: ScopeType.GLOBAL,
        scopeId: '*',
        period: 'WEEKLY',
        rankType: 'OVERALL',
        entityId: loc.id,
        position: rank++,
        previousPosition: rank === 2 ? 1 : rank === 3 ? 2 : rank,
        score: locationBaseScores[loc.id],
      },
    });
  }

  // 17. Seed Report Subscriptions
  await prisma.reportSubscription.create({
    data: {
      userId: corpAdmin.id,
      reportType: 'DAILY_PULSE',
      scopeType: ScopeType.GLOBAL,
      scopeId: '*',
      deliveryTime: '08:00',
      timezone: 'America/New_York',
      enabled: true,
    },
  });

  console.log('Database seeding successfully completed.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
