# BRASA Meat Intelligence OS — Deployment Reality

> **Document Purpose:** This document provides an accurate, non-promotional description of how BRASA OS is actually deployed and operated today. It is intended to give enterprise partners, technical due diligence reviewers, and future team members an honest baseline from which to plan — not to impress.
>
> **Audience:** Enterprise technical stakeholders, future DevOps/Platform engineers, investor technical reviews.
>
> **Status:** Point-in-time snapshot. Update after any infrastructure change.
>
> **Last Updated:** 2026-05-26

---

## Table of Contents

1. [Current Deployment Topology](#1-current-deployment-topology)
2. [What Requires Founder Presence Today](#2-what-requires-founder-presence-today)
3. [Operational Bottlenecks](#3-operational-bottlenecks)
4. [Scaling Constraints](#4-scaling-constraints)
5. [Pilot Deployment Assumptions](#5-pilot-deployment-assumptions)
6. [Path to Enterprise Readiness](#6-path-to-enterprise-readiness)

---

## 1. Current Deployment Topology

The production system runs on the following architecture. No infrastructure-as-code (Terraform, Pulumi, CDK) exists. The topology is manually managed.

### 1.1 Infrastructure Overview

| Component | Technology | Managed By | Notes |
|---|---|---|---|
| **Backend** | Node.js in Docker container | Railway dashboard | Deployed via `git push` to Railway |
| **Database** | PostgreSQL (managed by Railway) | Railway dashboard | Schema managed via Prisma ORM |
| **Frontend** | Vite static bundle | Railway (static serving) | Built locally, deployed as static files |
| **Job Queue** | BullMQ | N/A — in-memory mock | No persistent Redis instance |
| **Multi-tenancy** | Single application instance | Railway env vars | Subdomain resolution via CORS middleware |
| **CI/CD** | None | N/A | No automated test pipeline |
| **Monitoring** | None | N/A | Console.log only |

### 1.2 Networking & Multi-Tenancy

Multiple enterprise tenant subdomains (e.g., `outback.brasameat.com`, `terra.brasameat.com`) are served from a **single Railway application instance**. Tenant identification happens at the middleware layer: the incoming request's subdomain is resolved to a `companyId`, which is used to scope all subsequent data access.

Subdomain-to-tenant mappings are configured via **Railway environment variables**. There is no self-service tenant registration flow.

### 1.3 Redis / Queue Reality

BullMQ, the job queue library used for background processing (e.g., MeatEngine calculations, Sentinel Agent runs), is configured to use an **in-memory mock Redis adapter** in production. This is not a development placeholder — it is the current production configuration.

**Consequences:**
- Background job history is not persisted
- Jobs in-flight at the time of a server restart are **silently lost** with no error surfaced to operators
- Queue monitoring (Bull Board or similar) is non-functional against a mock adapter
- Retry logic is non-durable — a job that fails mid-execution and triggers a restart will not be re-queued

**Why this exists:** Persistent Redis adds cost and operational complexity. The in-memory mock was a valid early-stage decision. It becomes a liability as job volume and operational criticality grow.

### 1.4 Database Migrations

Prisma migrations are run **manually** by the founder via:

```bash
npx prisma migrate deploy
```

This command must be run against the production Railway PostgreSQL connection string. There is no migration automation triggered by deployment. Migrations can be forgotten during a rapid push cycle.

### 1.5 CI/CD Pipeline

**There is no CI/CD pipeline.** Deployments follow this manual process:

1. Founder develops locally
2. Code is committed and pushed to the Railway-connected git branch
3. Railway triggers a container rebuild automatically
4. Database migrations are run manually if the schema changed
5. The founder monitors Railway logs to confirm the deployment succeeded

There are no automated tests run before or after deployment. There are no deployment gates, smoke tests, or rollback automation.

---

## 2. What Requires Founder Presence Today

The following operations cannot be performed without the founder's direct involvement. There are no documented runbooks, delegated credentials, or automated scripts for any of these tasks.

### 2.1 Tenant Onboarding

Adding a new enterprise client requires manually:

1. Creating a `Company` record in the PostgreSQL database (via Prisma Studio or raw SQL)
2. Creating `Store` records for each restaurant location
3. Creating `User` records for each management-level user
4. Seeding baseline data (protein lists, targets, historical benchmarks if applicable)
5. Configuring a new subdomain in Railway environment variables
6. Updating CORS configuration to permit the new subdomain
7. Verifying tenant isolation by testing login from the new subdomain

**Current time estimate:** 2–4 hours per new enterprise tenant, depending on the number of stores and users.

### 2.2 Subdomain Configuration

New subdomains require:
- DNS record creation (at the domain registrar)
- Railway custom domain configuration
- Environment variable update for tenant-to-subdomain mapping
- CORS allowlist update in application code or configuration

None of these steps are scripted or automated.

### 2.3 Database Migrations

Any schema change requires:
- The founder to have the production `DATABASE_URL` credential locally
- Running `prisma migrate deploy` against the production database
- Verifying the migration did not break existing data
- No automated rollback if the migration causes issues

### 2.4 Demo Environment Preparation

Enterprise demos use **seeded synthetic data** that simulates realistic restaurant operations. Preparing a demo requires:

- Knowing which store IDs are demo stores (founder memory only — see `FOUNDER_KNOWLEDGE_MAP.md §3.2`)
- Running seed scripts that may need to be updated to reflect current product features
- Verifying that demo data produces compelling, realistic KPI outputs in the dashboard

If demo data becomes stale (e.g., after a schema migration), refreshing it requires the founder to manually re-seed and verify.

### 2.5 Distinguishing Seeded vs. Live Stores

There is no database flag distinguishing demo stores from live operational stores. The founder is the sole source of truth for which store IDs contain real data. If the founder is unavailable, there is no way for another team member to determine this reliably.

### 2.6 Redis / Queue Troubleshooting

Because BullMQ uses an in-memory mock, queue-related issues are difficult to diagnose:
- There is no queue dashboard
- Failed or dropped jobs generate no durable error log
- Reproducing a queue failure requires understanding the mock adapter's behavior

Troubleshooting requires the founder's knowledge of the queue architecture.

### 2.7 Production Incident Response

In the event of a production incident:
- There is no on-call rotation
- There is no incident response runbook
- There are no automated alerts (PagerDuty, Opsgenie, etc.)
- The founder monitors Railway logs manually
- Recovery options are limited to: restarting the Railway service, rolling back via `git revert`, or applying hotfix commits

---

## 3. Operational Bottlenecks

The following are known, documented constraints on operational agility. They are listed candidly so that planning can account for them.

### 3.1 Single-Person Deployment Authority

All production changes pass through one person. This creates:
- A **single point of failure** for any production change
- **Deployment velocity bounded** by one person's availability
- **No knowledge redundancy** for infrastructure operations
- Potential regulatory risk for enterprise clients with SLA requirements

### 3.2 No Automated Smoke Tests Post-Deployment

After each deployment, there is no automated verification that core functionality works. The current process relies on the founder manually testing key flows. Regressions can reach production users undetected.

### 3.3 Logging Is console.log Only

The application uses `console.log` for all diagnostic output. This means:
- No structured log format (JSON, key-value pairs)
- No log levels (DEBUG / INFO / WARN / ERROR)
- No log aggregation or search capability (no Datadog, Logtail, Papertrail, etc.)
- Debugging a production issue requires real-time Railway log streaming
- Historical log analysis is not possible — Railway log retention is limited

### 3.4 No APM or Observability Tooling

There is no Application Performance Monitoring. The following are unknown in production:
- Response time percentiles (p50, p95, p99)
- Database query performance
- Memory consumption trends
- Error rate by endpoint
- MeatEngine calculation duration per store

Performance degradation will not be detected until it causes visible user-facing slowness or crashes.

### 3.5 Redis Mock Means Lost Jobs on Restart

As described in §1.3, any server restart (including Railway's automatic restarts on deployment or crash recovery) silently drops all in-flight and queued background jobs. In practice this means:
- A MeatEngine calculation triggered at 11:55 PM and still running at midnight during an auto-restart will silently not complete
- There is no mechanism to detect or recover dropped jobs other than manually re-triggering them

### 3.6 Seeded Data Mixed With Real Operational Data

Demo/seeded data and live operational data coexist in the same PostgreSQL database with no distinguishing flag. This creates ongoing risk of:
- Demo data polluting aggregate company-level metrics
- Real data being misidentified as demo data and modified or deleted
- Incorrect benchmarks in executive reports that include synthetic stores

### 3.7 Inactive Stores Visible in Executive Dashboards

The MeatEngine does not filter by `store.status`. INACTIVE stores with residual data appear in:
- Executive dashboard aggregate calculations
- Network-level lbs/guest averages
- YTD cost summaries

This is a known issue without a formal bug filing as of the date of this document.

---

## 4. Scaling Constraints

### 4.1 Concurrent Tenant Capacity

**Current estimate: 1–3 enterprise tenants** before performance degradation becomes noticeable. This estimate is based on:

- The MeatEngine running **sequential store loops** (stores are processed one at a time, not in parallel)
- No database read replicas
- A single Railway instance with no horizontal scaling
- In-memory Redis mock that does not support distributed job queuing

This estimate has not been validated by load testing.

### 4.2 MeatEngine Sequential Processing

The MeatEngine iterates through stores in a `for` loop. For a tenant with 20 stores, each calculation run processes stores sequentially. If each store takes 500ms to calculate, a 20-store company takes 10 seconds minimum for a full calculation pass — before accounting for database query time.

**No parallel processing is implemented.** Scaling to enterprise tenants with 50–200 locations will require a fundamental rearchitecture of the MeatEngine execution model (worker pool, per-store queued jobs, etc.).

### 4.3 Queue Worker Concurrency

The BullMQ worker concurrency is controlled by `WORKER_CONCURRENCY` environment variable, defaulting to `10`. This is hardcoded and applies globally — there is no per-tenant or per-job-type concurrency tuning.

Combined with the in-memory mock Redis, this configuration provides limited real-world queue management.

### 4.4 Database Constraints

- No **read replicas** — all reads and writes hit the same PostgreSQL instance
- No **connection pooling** beyond Prisma's default behavior
- No **query caching**
- No **database-level performance monitoring**

Heavy MeatEngine calculations that require large dataset reads will compete with real-time dashboard query load on the same database connection pool.

### 4.5 Single Railway Instance

The application runs on a single Railway deployment with no auto-scaling, no load balancer, and no failover instance. A crash results in full downtime until Railway's crash-recovery restart completes (typically 30–90 seconds, but unvalidated).

---

## 5. Pilot Deployment Assumptions

The following assumptions underpin current pilot and demo operations. Enterprise partners evaluating the system should be aware of these.

### 5.1 Demo Environments Use Synthetic Data

Executive demos run against **seeded synthetic data**, not live operational data. The synthetic data is designed to be realistic and showcase the system's analytical capabilities. It does not represent actual restaurant performance from any specific chain.

**Implication for evaluation:** KPI outputs seen in demos reflect the system's calculation and visualization capabilities — not real-world outcomes from existing clients.

### 5.2 Some Dashboard Values Are Hardcoded

Certain KPIs visible in the Network-level executive dashboard are populated with hardcoded mock values, not calculated from real data. A registry of these values is maintained in `MOCK_DATA_REGISTRY.md` (see that file for the complete list and replacement plan).

**Implication:** Do not use Network dashboard aggregate figures for external reporting until mock values have been replaced with live calculations.

### 5.3 QA Sentinel Is On-Demand, Not Scheduled

The QA Sentinel Agent (which detects anomalies in inventory entries) currently runs **on-demand** — triggered manually or via API call. It does not run on a fixed production cron schedule.

**Implication:** Anomaly detection is not continuous. If a manager enters bad data and no one triggers the Sentinel, the bad data will persist unchallenged until the next manual run or weekly review.

### 5.4 Executive Demos Require Manual Preparation

Each executive demo requires the founder to:
1. Verify seeded data is current and consistent with the latest UI
2. Confirm demo stores are properly configured
3. Rehearse the demo flow to identify any regressions

There is no "one-click demo reset" automation. A failed demo caused by stale data or a regression requires live debugging.

---

## 6. Path to Enterprise Readiness

The following roadmap represents the minimum work required to transition from founder-managed pilot to enterprise-ready operations. Items are grouped by time horizon and priority.

### 6.1 Short-Term (0–3 Months) — Operational Stability

These items address immediate operational fragility. They should be completed before adding a second enterprise tenant.

| Priority | Item | Description |
|---|---|---|
| 🔴 P0 | **Persistent Redis** | Replace in-memory BullMQ mock with a real Redis instance (Railway offers managed Redis). Eliminates job loss on restart. |
| 🔴 P0 | **Seeded/Live Data Separation** | Add `data_type` field to `store` table. Filter MeatEngine and dashboards by `data_type = 'LIVE'` by default. |
| 🔴 P0 | **INACTIVE Store Filtering** | Add `WHERE status = 'ACTIVE'` to MeatEngine store queries. One-line fix with high impact. |
| 🟠 P1 | **Structured Logging** | Replace `console.log` with a structured logger (e.g., `pino`). Add log levels. Route to a log aggregator (e.g., Logtail, Papertrail). |
| 🟠 P1 | **Environment Variable Documentation** | Document all required `.env` variables with descriptions, valid values, and defaults in `.env.example`. |
| 🟠 P1 | **Automated Tenant Onboarding Script** | Build a CLI script to create Company + Stores + Users + initial config from a JSON input file. Reduces onboarding from 4 hours to under 30 minutes. |
| 🟡 P2 | **Deployment Runbook** | Written step-by-step instructions for: deployment, migration, tenant onboarding, incident response. |

### 6.2 Medium-Term (3–6 Months) — Quality & Independence

These items reduce founder-dependency and improve product quality to enterprise standards.

| Priority | Item | Description |
|---|---|---|
| 🟠 P1 | **CI/CD Pipeline** | GitHub Actions (or Railway's native CI) with: automated test run on PR, deploy-on-merge to main, post-deploy smoke test. |
| 🟠 P1 | **Automated Smoke Tests** | A minimal test suite that verifies: login works, dashboard loads, MeatEngine produces output, Sentinel runs without error. |
| 🟠 P1 | **Mock Data Elimination** | Replace all hardcoded values in `MOCK_DATA_REGISTRY.md` with live calculations. Required before any external reporting use. |
| 🟡 P2 | **MeatEngine Parallelization** | Convert sequential store loop to parallel processing (Promise.all with concurrency limit, or per-store queued jobs). Required before 50+ store tenants. |
| 🟡 P2 | **Sentinel Cron Schedule** | Move QA Sentinel from on-demand to a fixed production cron (e.g., nightly at 2 AM). Requires persistent Redis. |
| 🟡 P2 | **Bull Board or Queue Dashboard** | Add queue monitoring UI. Requires persistent Redis. |

### 6.3 Long-Term (6–12 Months) — Enterprise Scale

These items are necessary for enterprise SLA commitments and multi-region growth.

| Priority | Item | Description |
|---|---|---|
| 🟡 P2 | **Database Read Replicas** | Separate read load (dashboard queries) from write load (MeatEngine calculations). Required before 10+ concurrent enterprise tenants. |
| 🟡 P2 | **APM / Observability** | Integrate an APM tool (e.g., Datadog, New Relic, Sentry Performance). Required to support SLA commitments. |
| 🟢 P3 | **Multi-Region Deployment** | Deploy to multiple Railway regions (or migrate to AWS/GCP) to support international clients with latency SLAs. |
| 🟢 P3 | **Formal Incident Response** | Define SLAs, set up alerting (PagerDuty or equivalent), create incident response runbooks, establish an on-call rotation. |
| 🟢 P3 | **Horizontal Scaling** | Move to a load-balanced multi-instance deployment. Requires solving session stickiness and distributed queue coordination. |

---

## Appendix: Operational Maturity Self-Assessment

| Capability | Current State | Target State |
|---|---|---|
| Deployment automation | ❌ Manual git push | ✅ CI/CD with gates |
| Database migrations | ❌ Manual, founder-only | ✅ Automated in CI/CD |
| Job queue durability | ❌ In-memory, non-persistent | ✅ Persistent Redis |
| Observability | ❌ console.log only | ✅ Structured logs + APM |
| Tenant onboarding | ❌ Manual, 2–4 hrs | ✅ Scripted, <30 min |
| Smoke testing | ❌ Manual, post-deploy | ✅ Automated, pre-deploy gate |
| Data environment separation | ❌ Founder knowledge only | ✅ Database flag enforced |
| Incident response | ❌ Ad-hoc, founder-only | ✅ Runbook + alerts + on-call |
| Scaling headroom | ❌ ~1–3 tenants | ✅ 20+ tenants |
| Knowledge bus factor | ❌ 1 (founder) | ✅ Documented + team-shared |

> **Bus factor:** The number of people who would need to be incapacitated before the system cannot be operated. Current bus factor: **1**.

---

> This document should be treated as a living record of operational reality, not a static snapshot. Update it whenever a bottleneck is resolved, a new constraint is discovered, or the deployment topology changes.
