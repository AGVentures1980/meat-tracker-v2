import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { GuardStateSnapshot } from '../utils/GuardStateSnapshot';
import Redis from 'ioredis';

const prisma = new PrismaClient();

export class SRECommandController {
    
    // GET /api/v1/sre/health
    static async health(req: Request, res: Response) {
        try {
            // DB Health
            let dbStatus = 'OK';
            let dbLatency = 0;
            const dbStart = Date.now();
            try {
                await prisma.$queryRaw`SELECT 1`;
                dbLatency = Date.now() - dbStart;
                if (dbLatency > 3000) dbStatus = 'ERROR';
            } catch (e) {
                dbStatus = 'ERROR';
                dbLatency = Date.now() - dbStart;
            }

            // Redis Health
            let redisStatus = 'ERROR';
            let redisMode = 'MOCKED';
            let redisLatency = 0;
            if (process.env.REDIS_URL) {
                redisMode = 'LIVE';
                try {
                    const redis = new Redis(process.env.REDIS_URL, {
                        maxRetriesPerRequest: 1,
                        connectTimeout: 2000
                    });
                    const redisStart = Date.now();
                    const ping = await redis.ping();
                    if (ping === 'PONG') {
                        redisLatency = Date.now() - redisStart;
                        redisStatus = 'OK';
                    }
                    redis.disconnect();
                } catch (e) {
                    redisStatus = 'ERROR';
                }
            } else {
                redisStatus = 'MOCKED';
                redisMode = 'MOCKED';
            }

            // Railway Environment
            const railwayEnv = process.env.RAILWAY_ENVIRONMENT_NAME || 'production';

            // Tenants Health
            const companies = await prisma.company.findMany({
                include: {
                    stores: true,
                    AuditLog: {
                        orderBy: { created_at: 'desc' },
                        take: 1
                    }
                }
            });

            const tenantsStats = {
                total: companies.length,
                active: 0,
                inactive: 0,
                pilot: 0
            };

            for (const company of companies as any[]) {
                const hasPilotStore = company.stores.some((s: any) => s.is_pilot);
                const hasActiveStore = company.stores.some((s: any) => s.status === 'ACTIVE');
                if (hasPilotStore) {
                    tenantsStats.pilot++;
                } else if (hasActiveStore) {
                    tenantsStats.active++;
                } else {
                    tenantsStats.inactive++;
                }
            }

            // Migrations
            const migrations = await prisma.$queryRaw<any[]>`SELECT * FROM _prisma_migrations`;
            const blocked = migrations.filter(m => m.logs?.includes('mock failure') || m.migration_name.includes('mock')).length;
            
            const overallStatus = (dbStatus === 'ERROR' || redisStatus === 'ERROR' || blocked > 0) ? 'CRITICAL' : 
                                 (dbLatency > 500) ? 'DEGRADED' : 'HEALTHY';

            return res.json({
                timestamp: new Date().toISOString(),
                overall_status: overallStatus,
                checks: {
                    database: { status: dbStatus, latency_ms: dbLatency },
                    redis: { status: redisStatus, mode: redisMode, latency_ms: redisLatency },
                    railway: { environment: railwayEnv },
                    tenants: tenantsStats,
                    migrations: { 
                        total: migrations.length, 
                        safe: migrations.length - blocked, 
                        warnings: 0, 
                        blocked: blocked 
                    }
                },
                issues: []
            });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    // GET /api/v1/sre/issues
    static async issues(req: Request, res: Response) {
        try {
            const issues: any[] = [];
            const now = new Date();

            // Check Database
            const dbStart = Date.now();
            let dbLatency = 0;
            let dbError = false;
            try {
                await prisma.$queryRaw`SELECT 1`;
                dbLatency = Date.now() - dbStart;
            } catch (e) {
                dbError = true;
            }

            if (dbError || dbLatency > 3000) {
                issues.push({
                    id: 'issue-db-unreachable',
                    severity: 'CRITICAL',
                    code: 'DATABASE_UNREACHABLE',
                    title: 'Database unreachable or extremely slow',
                    description: `Latency: ${dbLatency}ms`,
                    detected_at: new Date().toISOString(),
                    antigravity_prompt: "CRITICAL — Database unreachable.\nCheck Railway dashboard → Postgres-20Hr → is it online?\nIf restarting: wait 2 minutes and check again.\nIf down: railway redeploy --service Postgres-20Hr",
                    railway_command: "railway redeploy --service Postgres-20Hr"
                });
            } else if (dbLatency > 500) {
                issues.push({
                    id: 'issue-db-latency',
                    severity: 'WARNING',
                    code: 'HIGH_DB_LATENCY',
                    title: 'Database latency high',
                    description: `Latency: ${dbLatency}ms (threshold: 500ms)`,
                    detected_at: new Date().toISOString(),
                    antigravity_prompt: `WARNING — Database latency ${dbLatency}ms (threshold: 500ms).\nCheck Railway → Postgres-20Hr → Metrics.\nIf persists > 10 min: railway redeploy --service Postgres-20Hr`,
                    railway_command: "railway logs --service Postgres-20Hr"
                });
            }

            // Check Redis
            let redisError = !process.env.REDIS_URL;
            if (process.env.REDIS_URL) {
                try {
                    const redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 1000 });
                    await redis.ping();
                    redis.disconnect();
                } catch (e) {
                    redisError = true;
                }
            }

            if (redisError) {
                issues.push({
                    id: 'issue-redis-mocked',
                    severity: 'CRITICAL',
                    code: 'REDIS_MOCKED',
                    title: 'Redis running in MOCKED mode or Unreachable',
                    description: 'Background queues not processing.',
                    detected_at: new Date().toISOString(),
                    antigravity_prompt: "URGENT — Redis MOCKED in Production.\nRun immediately:\nrailway environment → select production\nrailway service → select meat-tracker-v2\nrailway variables set REDIS_URL=\"redis://default:PyJBKWWhOqskNXLREeMHNLeZZiezdlZZ@redis-j0qr.railway.internal:6379\"\nrailway redeploy\nExpected: logs show 'Redis Mode: LIVE' after redeploy.",
                    railway_command: "railway variables set REDIS_URL=\"redis://default:PyJBKWWhOqskNXLREeMHNLeZZiezdlZZ@redis-j0qr.railway.internal:6379\""
                });
            }

            // Check Migrations
            const migrations = await prisma.$queryRaw<any[]>`SELECT * FROM _prisma_migrations`;
            const blockedMigrations = migrations.filter(m => m.logs?.includes('mock failure') || m.migration_name.includes('mock'));
            if (blockedMigrations.length > 0) {
                issues.push({
                    id: 'issue-migration-blocked',
                    severity: 'CRITICAL',
                    code: 'MIGRATION_BLOCKED',
                    title: 'Migration BLOCKED detected',
                    description: 'System boot might be prevented due to failed migration.',
                    detected_at: new Date().toISOString(),
                    antigravity_prompt: "CRITICAL — Migration BLOCKED detected.\nDO NOT restart the server.\nCopy the full migration log and paste here immediately.\nDo not attempt to fix without full log analysis.",
                    railway_command: "railway logs --service meat-tracker-v2"
                });
            }

            // Check Tenants
            const companies = await prisma.company.findMany({
                include: {
                    stores: true,
                    AuditLog: {
                        orderBy: { created_at: 'desc' },
                        take: 1
                    }
                }
            });

            const usersByCompany = await prisma.user.groupBy({ by: ['company_id'], _count: true });
            const userCountMap: Record<string, number> = {};
            usersByCompany.forEach(u => { if(u.company_id) userCountMap[u.company_id] = u._count; });

            for (const company of companies as any[]) {
                // Hard Rock Stores Check
                if (company.id === '3a6ac28e-6b5e-4a60-8ad6-5bc18a4b5037') {
                    const inactiveStores = company.stores.filter((s: any) => s.status !== 'ACTIVE');
                    if (inactiveStores.length > 0) {
                        issues.push({
                            id: `issue-hr-inactive-${company.id}`,
                            severity: 'CRITICAL',
                            code: 'HARDROCK_STORES_INACTIVE',
                            title: 'Hard Rock store INACTIVE',
                            description: `${inactiveStores.length} stores inactive`,
                            detected_at: new Date().toISOString(),
                            antigravity_prompt: "CRITICAL — Hard Rock store INACTIVE.\nRun:\nDATABASE_URL=\"postgresql://postgres:jGGSjkxLCUhXQYntCHXoJQKGVRuWhIWu@yamanote.proxy.rlwy.net:48358/railway\" npx ts-node -e \"\nimport { PrismaClient } from '@prisma/client';\nconst p = new PrismaClient();\np.store.updateMany({ where: { company_id: '3a6ac28e-6b5e-4a60-8ad6-5bc18a4b5037' } as any, data: { status: 'ACTIVE', activated_at: new Date() } as any }).then(() => { console.log('Fixed'); p.$disconnect(); });\n\""
                        });
                    }
                }

                // TENANT_NO_DATA
                const userCount = userCountMap[company.id] || 0;
                if (company.stores.length === 0 || userCount === 0) {
                    issues.push({
                        id: `issue-nodata-${company.id}`,
                        severity: 'INFO',
                        code: 'TENANT_NO_DATA',
                        title: `Tenant ${company.name} has no stores/users`,
                        description: 'Tenant needs onboarding.',
                        detected_at: new Date().toISOString(),
                        antigravity_prompt: `INFO — Tenant ${company.name} has no stores/users.\nRun onboarding when ready:\nnpx ts-node src/scripts/onboard_tenant.ts --company-id ${company.id}`
                    });
                } else {
                    // NO_RECENT_ACTIVITY
                    const hasActiveStore = company.stores.some((s: any) => s.status === 'ACTIVE');
                    if (hasActiveStore) {
                        const lastActivity = company.AuditLog.length > 0 ? new Date(company.AuditLog[0].created_at) : null;
                        const hoursSince = lastActivity ? (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60) : Infinity;
                        
                        if (hoursSince > 48) {
                            issues.push({
                                id: `issue-noact-${company.id}`,
                                severity: 'WARNING',
                                code: 'NO_RECENT_ACTIVITY',
                                title: `Tenant ${company.name} has no activity in 48h`,
                                description: 'Could indicate adoption drop off.',
                                detected_at: new Date().toISOString(),
                                antigravity_prompt: `WARNING — Tenant ${company.name} has no activity in 48h.\nVerify: is this expected?\nIf unexpected: check login at ${company.subdomain || 'app'}.brasameat.com`
                            });
                        }
                    }

                    // STORE_NO_OUTLETS (Simplified check based on a mock for now, 
                    // or we query Outlets if the Outlet model exists. Since we didn't include outlets in the Company query, let's query it.)
                    const storesWithoutOutlets = await prisma.store.findMany({
                        where: { company_id: company.id, status: 'ACTIVE' }
                    });
                    
                    const storeIds = storesWithoutOutlets.map(s => s.id);
                    const outletsByStore = storeIds.length > 0 ? await prisma.$queryRaw<any[]>`SELECT store_id, COUNT(*) as cnt FROM "Outlet" WHERE store_id IN (${Prisma.join(storeIds)}) GROUP BY store_id` : [];
                    const outletCountMap = new Map();
                    outletsByStore.forEach(row => outletCountMap.set(row.store_id, Number(row.cnt)));
                    
                    for (const store of storesWithoutOutlets) {
                        const cnt = outletCountMap.get(store.id) || 0;
                        if (cnt === 0) {
                            issues.push({
                                id: `issue-no-outlets-${store.id}`,
                                severity: 'INFO',
                                code: 'STORE_NO_OUTLETS',
                                title: `Store ${store.store_name} has no outlets`,
                                description: 'Active store missing outlets setup.',
                                detected_at: new Date().toISOString(),
                                antigravity_prompt: `INFO — Store ${store.store_name} has no outlets.\nRun: DATABASE_URL="..." npx ts-node src/scripts/seed_outlets.ts`
                            });
                        }
                    }
                }
            }

            return res.json({ issues });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    // GET /api/v1/sre/tenants
    static async tenants(req: Request, res: Response) {
        try {
            const companies = await prisma.company.findMany({
                include: {
                    stores: true,
                    AuditLog: {
                        orderBy: { created_at: 'desc' },
                        take: 1
                    }
                }
            });

            const usersByCompany = await prisma.user.groupBy({ by: ['company_id'], _count: true });
            const userCountMap: Record<string, number> = {};
            usersByCompany.forEach(u => { if(u.company_id) userCountMap[u.company_id] = u._count; });

            const outletsByCompany = await prisma.$queryRaw<any[]>`SELECT company_id, COUNT(*) as cnt FROM "Outlet" GROUP BY company_id`;
            const outletCountMap: Record<string, number> = {};
            outletsByCompany.forEach(o => { if(o.company_id) outletCountMap[o.company_id] = Number(o.cnt); });

            const now = new Date();
            const tenants = (companies as any[]).map(company => {
                const storesCount = company.stores.length;
                const outletsCount = outletCountMap[company.id] || 0;
                const usersCount = userCountMap[company.id] || 0;
                const lastActivity = company.AuditLog.length > 0 ? company.AuditLog[0].created_at : null;

                let status = 'INACTIVE';
                if (company.stores.some((s: any) => s.status === 'ACTIVE')) status = 'ACTIVE';
                if (company.stores.some((s: any) => s.is_pilot)) status = 'PILOT';

                let health = 'NO_DATA';
                if (storesCount > 0 && usersCount > 0) {
                    if (lastActivity) {
                        const daysSince = (now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24);
                        if (daysSince <= 7) health = 'HEALTHY';
                        else if (daysSince <= 30) health = 'STALE';
                        else health = 'NO_DATA'; // very old
                    }
                }

                return {
                    company_id: company.id,
                    name: company.name,
                    subdomain: company.subdomain,
                    stores_count: storesCount,
                    outlets_count: outletsCount,
                    users_count: usersCount,
                    last_activity: lastActivity,
                    status,
                    health
                };
            });

            return res.json({ tenants });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    // GET /api/v1/sre/metrics
    static async metrics(req: Request, res: Response) {
        try {
            const range = req.query.range as string || '7d';
            let days = parseInt(range.replace('d', '')) || 7;
            
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const auditEvents = await prisma.auditLog.groupBy({
                by: ['created_at'],
                where: { created_at: { gte: startDate } },
                _count: true
            });

            // Group by day string
            const auditByDayMap: Record<string, number> = {};
            for (let i = 0; i <= days; i++) {
                const d = new Date(startDate);
                d.setDate(d.getDate() + i);
                auditByDayMap[d.toISOString().split('T')[0]] = 0;
            }

            for (const event of auditEvents) {
                const day = new Date(event.created_at).toISOString().split('T')[0];
                if (auditByDayMap[day] !== undefined) {
                    auditByDayMap[day] += event._count;
                }
            }

            const audit_events_by_day = Object.keys(auditByDayMap).map(date => ({
                date,
                value: auditByDayMap[date]
            })).sort((a, b) => a.date.localeCompare(b.date));

            // active tenants mock series (constant for simplicity as historical tenant active status is hard to reconstruct without timeseries)
            const activeCompaniesCount = await prisma.company.count({
                where: { stores: { some: { status: 'ACTIVE' } } }
            });

            const active_tenants_by_day = audit_events_by_day.map(d => ({
                date: d.date,
                value: activeCompaniesCount
            }));

            // Totals
            const storesActive = await prisma.store.count({ where: { status: 'ACTIVE' } });
            
            // Try to count outlets if relation exists, otherwise 0
            let outletsTotal = 0;
            try {
                outletsTotal = await (prisma as any).outlet.count();
            } catch (e) { }

            const usersTotal = await prisma.user.count({ where: { is_active: true } });

            return res.json({
                range,
                series: {
                    audit_events_by_day,
                    active_tenants_by_day
                },
                totals: {
                    stores_active: storesActive,
                    outlets_total: outletsTotal,
                    users_total: usersTotal
                }
            });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }
}
