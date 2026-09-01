import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { GoogleBusinessProfileConnector } from '../../../../lib/connectors/google';
import { ContentType, ProcessingStatus } from '@prisma/client';
import { writeScoreSnapshots } from '../../../../lib/scoring';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const orgId = searchParams.get('organizationId');

  if (!orgId) {
    return NextResponse.json({ error: 'Missing organizationId' }, { status: 400 });
  }

  const connector = new GoogleBusinessProfileConnector(orgId);

  try {
    if (action === 'GET_STATUS') {
      const status = await connector.getStatus();
      const creds = await connector.getCredentials();
      const integration = await db.integration.findFirst({
        where: { organizationId: orgId, dataSourceId: 'GOOGLE' }
      });
      return NextResponse.json({
        status,
        mockMode: creds.mockMode,
        allowResponsePublishing: integration?.allowResponsePublishing || false,
        lastSyncAt: integration?.lastSyncAt || null,
        nextSyncAt: integration?.nextSyncAt || null,
        errorState: integration?.errorState || null,
        accountId: creds.accountId || null
      });
    }

    if (action === 'DISCOVER_ACCOUNTS') {
      const creds = await connector.getCredentials();
      if (creds.mockMode) {
        return NextResponse.json([
          { name: 'accounts/112233445566', displayName: 'BRASA Group Holding (Mock)', type: 'ORGANIZATION' }
        ]);
      }

      if (!creds.accessToken) {
        return NextResponse.json({ error: 'Not authorized yet' }, { status: 400 });
      }

      const accounts = await connector.accountClient.listAccounts(creds.accessToken);
      return NextResponse.json(accounts);
    }

    if (action === 'DISCOVER_LOCATIONS') {
      const creds = await connector.getCredentials();
      if (!creds.accountId) {
        return NextResponse.json({ error: 'No account selected' }, { status: 400 });
      }

      if (creds.mockMode) {
        const locs = await db.location.findMany({ where: { organizationId: orgId } });
        return NextResponse.json(
          locs.map((loc) => ({
            name: `locations/mock-${loc.id}`,
            title: `${loc.name} (Google)`,
            storefrontAddress: {
              addressLines: [loc.address],
              locality: loc.city,
              administrativeArea: loc.state,
              postalCode: '33602'
            },
            phone: loc.phone || '813-555-0199',
            website: loc.website || 'https://brasasteakhouse.com',
            categories: [{ displayName: 'Brazilian Steakhouse' }]
          }))
        );
      }

      if (!creds.accessToken) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 400 });
      }

      const locations = await connector.locationClient.listLocations(creds.accessToken, creds.accountId);
      return NextResponse.json(locations);
    }

    if (action === 'SYNC_HISTORY') {
      const integration = await db.integration.findFirst({
        where: { organizationId: orgId, dataSourceId: 'GOOGLE' }
      });
      if (!integration) return NextResponse.json([]);
      const history = await db.syncHistory.findMany({
        where: { integrationId: integration.id },
        orderBy: { startedAt: 'desc' },
        take: 20
      });
      return NextResponse.json(history);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error occurred' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, organizationId, accountId, externalEntityId, locationId, allowResponsePublishing } = body;

    if (!organizationId) {
      return NextResponse.json({ error: 'Missing organizationId' }, { status: 400 });
    }

    const connector = new GoogleBusinessProfileConnector(organizationId);

    if (action === 'SELECT_ACCOUNT') {
      if (!accountId) {
        return NextResponse.json({ error: 'Missing accountId' }, { status: 400 });
      }
      const creds = await connector.getCredentials();
      creds.accountId = accountId;
      await connector.saveCredentials(creds);
      return NextResponse.json({ success: true, credentials: creds });
    }

    if (action === 'MAP_LOCATION') {
      if (!externalEntityId || !locationId) {
        return NextResponse.json({ error: 'Missing mapping parameters' }, { status: 400 });
      }

      const existing = await db.sourceEntityMapping.findFirst({
        where: { organizationId, dataSourceId: 'GOOGLE', externalEntityId }
      });

      if (existing) {
        await db.sourceEntityMapping.update({
          where: { id: existing.id },
          data: { entityId: locationId, verified: true }
        });
      } else {
        await db.sourceEntityMapping.create({
          data: {
            organizationId,
            dataSourceId: 'GOOGLE',
            externalEntityId,
            entityType: 'LOCATION',
            entityId: locationId,
            confidence: 100.0,
            verified: true
          }
        });
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'UNMAP_LOCATION') {
      if (!externalEntityId) {
        return NextResponse.json({ error: 'Missing externalEntityId' }, { status: 400 });
      }
      await db.sourceEntityMapping.deleteMany({
        where: { organizationId, dataSourceId: 'GOOGLE', externalEntityId }
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'TOGGLE_PUBLISHING') {
      const integration = await db.integration.findFirst({
        where: { organizationId, dataSourceId: 'GOOGLE' }
      });

      if (!integration) {
        return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
      }

      const updated = await db.integration.update({
        where: { id: integration.id },
        data: { allowResponsePublishing: !!allowResponsePublishing }
      });

      const firstUser = await db.user.findFirst({ where: { organizationId } });
      await db.auditLog.create({
        data: {
          organizationId,
          userId: firstUser?.id || null,
          action: 'TOGGLE_GOOGLE_RESPONSE_PUBLISHING',
          entityType: 'INTEGRATION',
          entityId: integration.id,
          newValue: { allowResponsePublishing: !!allowResponsePublishing }
        }
      });

      return NextResponse.json({ success: true, integration: updated });
    }

    if (action === 'DISCONNECT') {
      // 1. Explicitly switch integration mode to LIVE (mockMode: false) and clear credentials tokens
      await connector.saveCredentials({ mockMode: false });

      // 2. Fetch all locations for organization
      const locations = await db.location.findMany({
        where: { organizationId }
      });

      // 3. Recalculate scores to exclude DEMO content from LIVE analytics
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      for (const loc of locations) {
        try {
          await writeScoreSnapshots(organizationId, loc.id, startDate, endDate);
        } catch (err) {
          console.error(`Failed to write score snapshots for location ${loc.id} during disconnect:`, err);
        }
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'SYNC') {
      let integration = await db.integration.findFirst({
        where: { organizationId, dataSourceId: 'GOOGLE' }
      });

      if (!integration) {
        integration = await db.integration.create({
          data: {
            organizationId,
            dataSourceId: 'GOOGLE',
            status: 'ACTIVE',
            allowResponsePublishing: false
          }
        });
      }

      const syncHistory = await db.syncHistory.create({
        data: {
          integrationId: integration.id,
          status: 'RUNNING',
          itemsFetched: 0,
          itemsCreated: 0,
          itemsUpdated: 0,
          itemsSkipped: 0,
          failures: 0
        }
      });

      const creds = await connector.getCredentials();

      try {
        let fetched = 0;
        let created = 0;
        let updated = 0;

        if (creds.mockMode) {
          const mappedLocations = await db.sourceEntityMapping.findMany({
            where: { organizationId, dataSourceId: 'GOOGLE', entityType: 'LOCATION' }
          });

          for (const mapping of mappedLocations) {
            const loc = await db.location.findUnique({ where: { id: mapping.entityId } });
            if (!loc) continue;

            const mockReviews = [
              {
                externalId: `google-mock-review-${loc.id}-1`,
                rating: 5,
                text: 'The rodizio service was absolutely incredible, meats kept coming non-stop! Best steakhouse in town.',
                authorName: 'Gabriel Sousa',
                publishedAt: new Date(Date.now() - 2 * 3600 * 1000)
              },
              {
                externalId: `google-mock-review-${loc.id}-2`,
                rating: 4,
                text: 'Great salad bar options and side dishes. The picanha was perfectly cooked, but wait times at the door were long.',
                authorName: 'Sarah Jenkins',
                publishedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000)
              },
              {
                externalId: `google-mock-review-${loc.id}-3`,
                rating: 2,
                text: 'Had to wait nearly 30 minutes for our table. Waiter forgot our drink order twice and the meat felt dry.',
                authorName: 'Robert Vance',
                publishedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000)
              }
            ];

            fetched += mockReviews.length;

            for (const review of mockReviews) {
              const existingItem = await db.contentItem.findFirst({
                where: { externalId: review.externalId }
              });

              if (existingItem) {
                await db.contentItem.update({
                  where: { id: existingItem.id },
                  data: {
                    rating: review.rating,
                    text: review.text,
                    publishedAt: review.publishedAt,
                    provenanceMode: 'DEMO'
                  }
                });
                updated++;
              } else {
                const createdItem = await db.contentItem.create({
                  data: {
                    organizationId,
                    dataSourceId: 'GOOGLE',
                    locationId: loc.id,
                    externalId: review.externalId,
                    contentType: ContentType.REVIEW,
                    rating: review.rating,
                    text: review.text,
                    authorName: review.authorName,
                    publishedAt: review.publishedAt,
                    provenanceMode: 'DEMO',
                    provenanceConnector: 'GOOGLE',
                    processingStatus: ProcessingStatus.INGESTED
                  }
                });

                await db.job.create({
                  data: {
                    type: 'analyzeContent',
                    payload: { contentItemId: createdItem.id }
                  }
                });
                created++;
              }
            }

            await db.job.create({
              data: {
                type: 'calculateScores',
                payload: { locationId: loc.id }
              }
            });
          }
        } else {
          throw new Error('READY FOR GOOGLE CREDENTIALS / API ACCESS');
        }

        await db.syncHistory.update({
          where: { id: syncHistory.id },
          data: {
            status: 'SUCCESS',
            completedAt: new Date(),
            itemsFetched: fetched,
            itemsCreated: created,
            itemsUpdated: updated
          }
        });

        await db.integration.update({
          where: { id: integration.id },
          data: { lastSyncAt: new Date() }
        });

        return NextResponse.json({
          success: true,
          fetched,
          created,
          updated
        });
      } catch (err: any) {
        await db.syncHistory.update({
          where: { id: syncHistory.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            errorSummary: err.message || 'Sync failed',
            failures: 1
          }
        });

        await db.integration.update({
          where: { id: integration.id },
          data: { errorState: err.message || 'Sync failed' }
        });

        return NextResponse.json({ error: err.message || 'Sync failed' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error occurred' }, { status: 500 });
  }
}
