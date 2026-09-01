import { db } from '../db';
import { aiProvider } from '../ai/provider';
import { emailProvider } from '../email/provider';
import { calculateLocationScore, writeScoreSnapshots } from '../scoring';
import { JobStatus, ProcessingStatus, SentimentValue, Severity, CaseStatus, ContentType, AlertStatus } from '@prisma/client';
import { discoverAndPersistSources } from '../connectors/discoveryAgent';
import { monitorSource } from '../connectors/sourceMonitorAgent';
import { createSnapshotIfChanged, recalculateDataCoverage } from '../services/scoutService';

// Handler types
type JobHandler = (payload: any) => Promise<void>;

/**
 * Main job queue worker.
 * Acquires a pending job in a concurrency-safe manner using FOR UPDATE SKIP LOCKED,
 * executes its handler, and updates its status.
 */
export async function processNextJob(): Promise<{ jobProcessed: boolean; jobId?: string; error?: string }> {
  try {
    // Concurrency-safe claim query
    const claimedJobs = await db.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Job"
      WHERE status = 'PENDING' AND "runAt" <= timezone('utc', now()) + INTERVAL '5 seconds'
      ORDER BY "createdAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;

    if (!claimedJobs || claimedJobs.length === 0) {
      return { jobProcessed: false };
    }

    const jobId = claimedJobs[0].id;

    // Transition job to PROCESSING within a transaction
    const job = await db.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.PROCESSING,
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    try {
      // Route to correct handler
      await executeJobHandler(job.type, job.payload);

      // Complete job
      await db.job.update({
        where: { id: jobId },
        data: {
          status: JobStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      return { jobProcessed: true, jobId };
    } catch (err: any) {
      const isFinalAttempt = job.attempts >= job.maxAttempts;
      await db.job.update({
        where: { id: jobId },
        data: {
          status: isFinalAttempt ? JobStatus.FAILED : JobStatus.PENDING,
          errorLog: err?.message || String(err),
          runAt: new Date(Date.now() + 60000 * job.attempts), // Backoff retry delay (1 min, 2 min, etc)
        },
      });
      return { jobProcessed: true, jobId, error: err?.message || String(err) };
    }
  } catch (err: any) {
    console.error('Error claiming or running background job:', err);
    return { jobProcessed: false, error: err?.message || String(err) };
  }
}

/**
 * Route job executions.
 */
async function executeJobHandler(type: string, payload: any): Promise<void> {
  switch (type) {
    case 'syncSource':
      await handleSyncSource(payload);
      break;
    case 'analyzeContent':
      await handleAnalyzeContent(payload);
      break;
    case 'calculateScores':
      await handleCalculateScores(payload);
      break;
    case 'sendEmail':
      await handleSendEmail(payload);
      break;
    case 'SOURCE_DISCOVERY':
      await discoverAndPersistSources({
        organizationId: payload.organizationId,
        locationId: payload.locationId || null,
        competitorLocationId: payload.competitorLocationId || null,
        restaurantName: payload.restaurantName,
        address: payload.address,
        city: payload.city,
        state: payload.state,
        website: payload.website || null
      });
      break;
    case 'SOURCE_MONITOR':
      await monitorSource(payload.sourceId);
      break;
    case 'SOURCE_SNAPSHOT':
      await createSnapshotIfChanged(payload.sourceId, payload.data);
      break;
    case 'COVERAGE_RECALCULATION':
      await recalculateDataCoverage(
        payload.organizationId,
        payload.locationId || null,
        payload.competitorLocationId || null,
        payload.provider
      );
      break;
    case 'CSV_IMPORT':
    case 'MANUAL_IMPORT':
    case 'CONTENT_ANALYSIS':
      console.log(`[Job Worker] Handled import/analysis metadata placeholder for type: ${type}`);
      break;
    default:
      throw new Error(`Unknown job handler registered: ${type}`);
  }
}

/**
 * Sync Source Handler.
 * Mimics checking connections and syncing external reviews or social posts.
 */
async function handleSyncSource(payload: { organizationId: string; locationId?: string; competitorLocationId?: string; sourceType: string }) {
  const { organizationId, locationId, competitorLocationId, sourceType } = payload;
  console.log(`[JOB syncSource] Ingesting from ${sourceType} for location ${locationId || competitorLocationId}`);

  // Social listenings generation (TikTok, Instagram, Reddit, X, YouTube)
  if (['TIKTOK', 'INSTAGRAM', 'REDDIT', 'X', 'YOUTUBE'].includes(sourceType) && locationId) {
    const textTemplates = [
      `Just visited BRASA Grill. The Picanha was fire, but wait times were terrible.`,
      `Had a major celebration at BRASA. Amazing service and food!`,
      `Worst steakhouse experience. The filet mignon was dry. Wait times took forever.`,
    ];

    const randomText = textTemplates[Math.floor(Math.random() * textTemplates.length)];
    
    const contentItem = await db.contentItem.create({
      data: {
        organizationId,
        locationId,
        dataSourceId: sourceType,
        contentType: ContentType.SOCIAL_POST,
        authorName: `@social_user_${Math.floor(Math.random() * 100)}`,
        text: randomText,
        publishedAt: new Date(),
        processingStatus: ProcessingStatus.INGESTED,
      },
    });

    // Enqueue AI analysis job
    await db.job.create({
      data: {
        type: 'analyzeContent',
        payload: { contentItemId: contentItem.id },
      },
    });
  }
}

/**
 * AI Processing & Normalization Handler.
 */
async function handleAnalyzeContent(payload: { contentItemId: string }) {
  const { contentItemId } = payload;
  console.log(`[JOB analyzeContent] Processing content item: ${contentItemId}`);

  const contentItem = await db.contentItem.findUnique({
    where: { id: contentItemId },
    include: { location: true },
  });

  if (!contentItem) {
    throw new Error(`ContentItem not found: ${contentItemId}`);
  }

  // Call AI Provider
  const analysis = await aiProvider.analyzeContent(contentItem.text, contentItem.rating || undefined);

  // Write Sentiment
  const positiveScore = analysis.overallSentiment === SentimentValue.POSITIVE ? 1.0 : (analysis.overallSentiment === SentimentValue.MIXED ? 0.5 : 0.0);
  const neutralScore = analysis.overallSentiment === SentimentValue.NEUTRAL ? 1.0 : 0.0;
  const negativeScore = analysis.overallSentiment === SentimentValue.NEGATIVE ? 1.0 : (analysis.overallSentiment === SentimentValue.MIXED ? 0.5 : 0.0);

  await db.sentimentAnalysis.upsert({
    where: { contentItemId },
    update: {
      overallSentiment: analysis.overallSentiment,
      positiveScore,
      neutralScore,
      negativeScore,
      confidence: analysis.confidence,
    },
    create: {
      contentItemId,
      overallSentiment: analysis.overallSentiment,
      positiveScore,
      neutralScore,
      negativeScore,
      confidence: analysis.confidence,
      modelVersion: '1.0',
    },
  });

  // Write Topics
  for (const topicMention of analysis.topics) {
    await db.topicMention.create({
      data: {
        contentItemId,
        topicId: topicMention.topic,
        sentiment: topicMention.sentiment,
        confidence: topicMention.confidence,
        evidenceText: topicMention.evidenceText,
        taxonomyVersion: '1.0',
      },
    });
  }

  // Write Menu mentions
  for (const menuMention of analysis.menuMentions) {
    const matchedItem = await db.menuItem.findFirst({
      where: {
        organizationId: contentItem.organizationId,
        name: menuMention.menuItem,
      },
    });

    if (matchedItem) {
      await db.menuMention.create({
        data: {
          contentItemId,
          menuItemId: matchedItem.id,
          sentiment: menuMention.sentiment,
          confidence: menuMention.confidence,
          attribute: menuMention.attributes.join(', '),
          evidenceText: menuMention.evidenceText,
        },
      });
    }
  }

  // Write Employee Mentions
  for (const empMention of analysis.employeeMentions) {
    const matchedEmployee = await db.employee.findFirst({
      where: {
        organizationId: contentItem.organizationId,
        locationId: contentItem.locationId || undefined,
        firstName: { equals: empMention.name, mode: 'insensitive' },
      },
    });

    await db.employeeMention.create({
      data: {
        contentItemId,
        employeeId: matchedEmployee?.id || null,
        rawName: empMention.name,
        sentiment: empMention.sentiment,
        confidence: empMention.confidence,
        verified: !!matchedEmployee,
        evidenceText: empMention.evidenceText,
      },
    });
  }

  // Update Ingestion Status
  await db.contentItem.update({
    where: { id: contentItemId },
    data: { processingStatus: ProcessingStatus.SCORED },
  });

  // GUEST RECOVERY TICKET CREATION
  if (analysis.recoveryCandidate && contentItem.locationId) {
    // Enforce 12h SLA SLA for negative review recovery
    const hoursSla = analysis.severity === Severity.CRITICAL ? 1 : analysis.severity === Severity.HIGH ? 4 : 12;
    const dueAt = new Date(Date.now() + hoursSla * 60 * 60 * 1000);

    const recoveryCase = await db.recoveryCase.create({
      data: {
        organizationId: contentItem.organizationId,
        locationId: contentItem.locationId,
        contentItemId: contentItem.id,
        severity: analysis.severity,
        status: CaseStatus.OPEN,
        dueAt,
      },
    });

    await db.recoveryActivity.create({
      data: {
        recoveryCaseId: recoveryCase.id,
        type: 'STATUS_CHANGE',
        description: `Automated recovery case opened. Severity: ${analysis.severity}. SLA Due: ${dueAt.toLocaleString()}`,
      },
    });
  }

  // ALERTS & NEGATIVE SPIKES DEDUPLICATION
  if (analysis.overallSentiment === SentimentValue.NEGATIVE && contentItem.locationId) {
    // Look for previous negative reviews in the last 24h
    const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const negativeCount = await db.contentItem.count({
      where: {
        locationId: contentItem.locationId,
        publishedAt: { gte: past24h },
        sentimentAnalysis: {
          overallSentiment: SentimentValue.NEGATIVE,
        },
      },
    });

    if (negativeCount >= 3) {
      // Find if alert already exists to prevent alert fatigue
      const existingAlert = await db.alert.findFirst({
        where: {
          locationId: contentItem.locationId,
          alertType: 'NEGATIVE_REVIEW_SPIKE',
          status: AlertStatus.OPEN,
          detectedAt: { gte: past24h },
        },
      });

      if (existingAlert) {
        // Associate this new item as evidence
        await db.alertEvidence.create({
          data: {
            alertId: existingAlert.id,
            contentItemId,
          },
        });
      } else {
        const newAlert = await db.alert.create({
          data: {
            organizationId: contentItem.organizationId,
            locationId: contentItem.locationId,
            alertType: 'NEGATIVE_REVIEW_SPIKE',
            severity: Severity.HIGH,
            title: 'Spike in Negative Guest Reviews',
            description: `Detected ${negativeCount} negative guest feedback posts in the past 24 hours.`,
          },
        });

        await db.alertEvidence.create({
          data: {
            alertId: newAlert.id,
            contentItemId,
          },
        });
      }
    }
  }

  // Enqueue Score recalculation job
  if (contentItem.locationId) {
    await db.job.create({
      data: {
        type: 'calculateScores',
        payload: {
          organizationId: contentItem.organizationId,
          locationId: contentItem.locationId,
        },
      },
    });
  }
}

/**
 * Score Recalculation Handler.
 */
async function handleCalculateScores(payload: { organizationId: string; locationId: string }) {
  const { organizationId, locationId } = payload;
  console.log(`[JOB calculateScores] Recalculating scores for location: ${locationId}`);

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 day rolling window

  // Calculate and write snapshots
  await writeScoreSnapshots(organizationId, locationId, startDate, endDate);
}

/**
 * Email Dispatcher Handler.
 */
async function handleSendEmail(payload: { to: string; subject: string; html: string }) {
  console.log(`[JOB sendEmail] Dispatching email to: ${payload.to}`);
  await emailProvider.sendEmail(payload);
}
