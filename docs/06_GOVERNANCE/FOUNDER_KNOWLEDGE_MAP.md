# BRASA Meat Intelligence OS — Founder Knowledge Map

> **Document Purpose:** This file captures all tacit, founder-held knowledge that is currently embedded in the codebase without sufficient documentation. It exists so that a future senior engineer, investor technical reviewer, or new team member can understand *why* the system behaves the way it does — not just *what* it does.
>
> **Audience:** Senior engineers (Day 1 onboarding), technical due diligence reviewers, future CTOs.
>
> **Status:** Living document. Update whenever a new design decision encodes implicit operational knowledge.
>
> **Last Updated:** 2026-05-26

---

## Table of Contents

1. [Operational Algorithm Knowledge](#1-operational-algorithm-knowledge)
   - [1.1 The 0.25 Bacon Ratio](#11-the-025-bacon-ratio)
   - [1.2 Gaucho Chicken Bounded Logic](#12-gaucho-chicken-bounded-logic)
   - [1.3 The Delivery Firewall](#13-the-delivery-firewall)
   - [1.4 Fail-Open on Garcia Rule](#14-fail-open-on-garcia-rule)
   - [1.5 Beef Ribs Unit Confusion Pattern](#15-beef-ribs-unit-confusion-pattern)
   - [1.6 Systemic Variance Threshold (>50 lbs / 3+ cycles)](#16-systemic-variance-threshold-50-lbs--3-cycles)
   - [1.7 The Wednesday Lock Rule Origin](#17-the-wednesday-lock-rule-origin)
2. [Business Logic & Classification Knowledge](#2-business-logic--classification-knowledge)
   - [2.1 Why Villains Are Tracked Separately](#21-why-villains-are-tracked-separately)
   - [2.2 The 80/20 Villain Approximation](#22-the-8020-villain-approximation)
3. [Deployment & Operational Knowledge](#3-deployment--operational-knowledge)
   - [3.1 Production Deployment Topology](#31-production-deployment-topology)
   - [3.2 Seeded vs. Live Data Distinction](#32-seeded-vs-live-data-distinction)
   - [3.3 Inactive Store Risk](#33-inactive-store-risk)
4. [Institutionalization Roadmap](#4-institutionalization-roadmap)

---

## 1. Operational Algorithm Knowledge

---

### 1.1 The 0.25 Bacon Ratio

| Field | Detail |
|---|---|
| **Risk Level** | 🔴 CRITICAL |
| **Current Location** | MeatEngine (bacon ratio constant) |
| **Approximate Line** | Look for `BACON_RATIO`, `baconRatio`, or `0.25` in meat calculation logic |

#### Operational Meaning

The `0.25` bacon ratio is not an arbitrary number. It was derived from direct measurement in an operational restaurant kitchen:

- 1 lb of wrapped steak or chicken = approximately **8 pieces**
- Each piece uses **0.5 bacon slices** (half a strip of bacon)
- 8 × 0.5 = **4 slices of bacon consumed per pound of wrapped protein**
- A standard pound of bacon contains **~16 slices**
- Therefore: 4 ÷ 16 = **0.25 lbs of bacon consumed per lb of wrapped protein**

This ratio directly drives bacon purchasing calculations. If a store wraps 200 lbs of steak, the system calculates 50 lbs of bacon consumed from that wrapping activity.

#### Business Risk If Lost

A future engineer might treat this constant as a rough estimate and "improve" it based on supplier data (e.g., a different count of slices per package). Any change to this ratio without kitchen revalidation will cause systematic over- or under-purchasing of bacon across every store. A 10% change in the ratio, compounded across multiple stores and weekly cycles, represents material food cost variance.

#### Recommendation for Institutionalization

- Add an inline code comment: `// 0.25 = derived from kitchen measurement: 8 pieces/lb × 0.5 slices/piece ÷ 16 slices/lb`
- Create a `MEAT_CONSTANTS.md` (or a config section in `config/`) documenting all calibrated constants with their derivation source
- Mark this constant as `KITCHEN_CALIBRATED` so it is never auto-updated by any algorithm tuning process

---

### 1.2 Gaucho Chicken Bounded Logic

| Field | Detail |
|---|---|
| **Risk Level** | 🔴 CRITICAL |
| **Current Location** | MeatEngine — chicken portion calculation |
| **Approximate Line** | Look for `Math.min`, `gauchoChicken`, or chicken-specific bounding logic |

#### Operational Meaning

In a Brazilian rodizio, each guest is expected to consume a target amount of chicken. However, a kitchen may produce *additional* chicken beyond what is served at the table — for example:

- Chicken prepared for the salad bar (not served as rodizio)
- Chicken prepared for to-go orders
- Overflow production during prep

This excess chicken must **not** be counted against the rodizio performance metric. If 80 lbs of chicken were produced and only 60 lbs were served rodizio-style to 40 guests, the per-guest metric should reflect the 60 lbs — not the full 80 lbs.

The bounded logic uses a cap tied to the operational target: any chicken production *above* the rodizio portion target for the guest count is excluded from the metric calculation. This preserves the integrity of the lbs/guest KPI as a rodizio-specific measure.

#### Business Risk If Lost

If the bound is removed or adjusted without understanding this context, the system will penalize stores that are efficiently running multiple revenue channels simultaneously (rodizio + catering + to-go). A high-performing store with a diverse production model would appear to be *over-serving* chicken, triggering false Sentinel alerts and incorrect executive dashboard data.

#### Recommendation for Institutionalization

- Add a `// RODIZIO_ONLY: caps chicken contribution to operational rodizio target` comment
- Document the guest-target formula in a `PORTION_ECONOMICS.md` reference file
- Add a unit test case: "store with 50% chicken going to catering should not affect rodizio KPI"

---

### 1.3 The Delivery Firewall

| Field | Detail |
|---|---|
| **Risk Level** | 🔴 CRITICAL |
| **Current Location** | MeatEngine — order/sales ingestion logic |
| **Approximate Line** | Look for `OLO`, `delivery`, `firewall`, `isDineIn`, or order-source filtering |

#### Operational Meaning

OLO (the platform connecting UberEats and DoorDash) orders carry fundamentally different portion economics than dine-in rodizio:

- A rodizio target: **~1.76 lbs/guest** (all proteins combined)
- A delivery combo: may include **0.5 lbs total** across 3 proteins for one order

If delivery order data is blended into the dine-in lbs/guest calculation, the metric becomes statistically meaningless. A store doing high delivery volume would appear to have drastically low per-guest protein consumption, triggering false underperformance flags. Conversely, a store with unusual delivery combos could distort the average upward.

The Delivery Firewall filters OLO-sourced data at ingestion before it reaches any rodizio performance calculation. It is a financial precision mechanism, not a simple data filter.

#### Business Risk If Lost

Removing the firewall would corrupt the lbs/guest KPI for any store with delivery operations, making the executive dashboard unreliable for cross-store comparison. Any performance review or cost optimization decision based on these numbers would be systematically wrong for delivery-enabled locations.

#### Recommendation for Institutionalization

- Rename or annotate the filter with: `// DELIVERY_FIREWALL: OLO orders excluded from rodizio lbs/guest metric — different portion economics`
- Add an integration test: "store with 30% OLO order volume should have identical lbs/guest to a pure dine-in store with same rodizio numbers"
- Consider surfacing delivery metrics in a *separate* dashboard section to avoid losing that data entirely

---

### 1.4 Fail-Open on Garcia Rule

| Field | Detail |
|---|---|
| **Risk Level** | 🟠 HIGH |
| **Current Location** | Garcia Rule middleware / authorization logic |
| **Approximate Line** | Look for `garciaRule`, `fail-open`, `try/catch` around role-gating logic, or Monday access logic |

#### Operational Meaning

The Garcia Rule governs a time-based or role-based access restriction — typically restricting certain actions to specific windows (e.g., Monday morning administrative access). The implementation is deliberately **fail-open**: if the rule evaluation throws an error (e.g., due to a database timeout), access is **granted**, not denied.

This decision was made after simulating the consequences of a failure during Monday morning service — the highest-intensity administrative moment of the week for restaurant management teams. A fail-closed implementation would lock out the entire management team during the precise moment they most need access. The operational cost of a false lockout (service disruption, manual overrides, escalation calls) was assessed as exceeding the governance risk of a momentary unauthorized access window.

#### Business Risk If Lost

If a future engineer changes the error handling path to fail-closed (a natural "security-first" instinct), the system will lock out restaurant management during database incidents. This will generate urgent support calls, potential service disruptions, and erode operator trust in the platform. The risk is highest during Monday mornings, which may coincide with high database load from weekly reporting.

#### Recommendation for Institutionalization

- Add a comment in the error-handling block: `// FAIL-OPEN INTENTIONAL: See FOUNDER_KNOWLEDGE_MAP.md §1.4 — Monday lockout risk exceeds governance risk`
- Document the Garcia Rule's intent and the fail-open decision in a `AUTHORIZATION_DECISIONS.md` file
- If and when a persistent Redis-based session cache is added, revisit: fail-open may become unnecessary if rule evaluation no longer depends on a cold database call

---

### 1.5 Beef Ribs Unit Confusion Pattern

| Field | Detail |
|---|---|
| **Risk Level** | 🟠 HIGH |
| **Current Location** | Sentinel Agent — anomaly detection thresholds |
| **Approximate Line** | Look for `beefRibs`, `BEEF_RIBS`, threshold `< 20`, or Sentinel configuration |

#### Operational Meaning

Beef Ribs are a bone-in protein sold by the piece in Brazilian steakhouse operations. Each piece weighs approximately **5 lbs**. However, managers who trained on legacy paper-based inventory systems have a documented tendency to enter piece counts instead of weights:

- Manager intends to record: 12 pieces × 5 lbs = **60 lbs**
- Manager actually enters: **12** (in the lbs field)

A Sentinel threshold of `< 20 lbs` for Beef Ribs was calibrated specifically to catch this failure mode. Any entry below 20 lbs for Beef Ribs is flagged as a suspected unit/lbs confusion error, because 20 lbs represents only 4 pieces — an implausibly small Beef Ribs order for any operational shift in a Brazilian steakhouse.

This threshold was not invented; it was derived from analysis of real pilot data where this exact error pattern was observed repeatedly across multiple managers.

#### Business Risk If Lost

If the threshold is removed, lowered, or "generalized" to match other proteins, the system will silently accept entries like `12 lbs of Beef Ribs` as valid. The resulting inventory and cost data for Beef Ribs will be systematically wrong — either 5× understated (if pieces were entered) or triggering false surplus flags. Cost-per-lb calculations for Beef Ribs will be meaningless.

#### Recommendation for Institutionalization

- Comment the threshold: `// <20 lbs threshold: catches unit/lbs confusion — see pilot data analysis. Each Beef Rib piece ~5 lbs.`
- Add a `SENTINEL_CALIBRATION_LOG.md` that records each threshold, its derivation, and the pilot data that validated it
- Consider surfacing a specific error message to managers: "Beef Ribs entry of X lbs is below operational minimum. Did you mean X pieces?"

---

### 1.6 Systemic Variance Threshold (>50 lbs / 3+ cycles)

| Field | Detail |
|---|---|
| **Risk Level** | 🟡 MEDIUM |
| **Current Location** | Sentinel Agent — systemic variance detection |
| **Approximate Line** | Look for `systemicVariance`, `50`, or multi-cycle variance logic |

#### Operational Meaning

The Sentinel Agent distinguishes between *data entry errors* (one-time anomalies) and *systemic supply chain issues* (persistent patterns). The threshold that triggers a "systemic" flag is:

- **>50 lbs** of negative variance
- **Across 3 or more consecutive inventory cycles**

The 50 lb figure is a financial calibration point: at current market prices, 50 lbs of meat represents approximately **$250–$500 in cost**. This is the practical minimum dollar threshold at which a conversation with a supplier is financially worth initiating. Below this threshold, the variance is more likely noise, data error, or normal yield fluctuation.

The "3+ cycles" requirement prevents a single bad week from triggering a supplier escalation. Three consecutive cycles of the same shortfall is a signal that the issue is structural — supplier yield deterioration, a change in cutting standards, or a systematic shrinkage problem.

#### Business Risk If Lost

If the threshold is lowered, the system will generate supplier escalations for normal variance, damaging supplier relationships and wasting management attention. If it is raised, real supply chain problems will be invisible until they represent significantly larger financial losses.

#### Recommendation for Institutionalization

- Comment the threshold: `// 50 lbs ≈ $250-500 at market price — minimum financially actionable supplier conversation threshold`
- Store both parameters (`SYSTEMIC_LB_THRESHOLD` and `SYSTEMIC_CYCLE_COUNT`) in a config object or environment variable with clear documentation
- Create a `SENTINEL_CALIBRATION_LOG.md` that records this threshold alongside the business rationale

---

### 1.7 The Wednesday Lock Rule Origin

| Field | Detail |
|---|---|
| **Risk Level** | 🟠 HIGH |
| **Current Location** | Scheduling / week-lock logic |
| **Approximate Line** | ~Line 77 — `deadline.setDate(deadline.getDate() - 5)` |

#### Operational Meaning

The Wednesday Lock Rule enforces that a target week's meat plan must be finalized by the **Wednesday of the preceding week**. This rule was originally expressed verbally by the founder in Portuguese:

> *"até quarta-feira da semana anterior àquela semana que será vigente"*
> ("until the Wednesday of the week before the week in question")

The code implementation at line 77 uses: `deadline.setDate(deadline.getDate() - 5)`

The math: Monday of the target week, minus 5 days, equals Wednesday of the previous week. This is correct, but non-obvious — "minus 5" does not intuitively read as "Wednesday of last week" to most engineers. The existing code comment acknowledges the math is slightly confusing.

This rule is operationally essential: restaurant purchasing must be finalized mid-week to allow for supplier order processing, delivery scheduling, and receiving logistics before the service week begins.

#### Business Risk If Lost

If the `-5` offset is changed without understanding this constraint, plans could be lockable on Thursday or Friday of the preceding week — too late for supplier order processing. Alternatively, locking on Monday of the target week would make the lock rule operationally meaningless (the week has already started). Either change breaks the supply chain coordination function of the entire planning module.

#### Recommendation for Institutionalization

- Replace or augment the comment at line 77: `// -5 days from Monday of target week = Wednesday of previous week (founder rule: "até quarta da semana anterior")`
- Consider naming a constant: `const DAYS_BEFORE_TARGET_MONDAY_FOR_LOCK = 5; // Wednesday of prior week`
- Add a unit test: "lock deadline for week of [date] should always be the Wednesday of the prior week"

---

## 2. Business Logic & Classification Knowledge

---

### 2.1 Why Villains Are Tracked Separately

| Field | Detail |
|---|---|
| **Risk Level** | 🟠 HIGH |
| **Current Location** | MeatEngine — protein classification, Villain designation |
| **Approximate Line** | Look for `villain`, `VILLAIN`, `isVillain`, or protein classification config |

#### Operational Meaning

In the Brazilian steakhouse industry, a small set of proteins — typically **Picanha, Beef Ribs, Filet Mignon, and Lamb** — account for:

- **60–80% of total meat cost**
- But only **20–30% of total volume served**

This is the Pareto principle applied to protein economics. The "Villain" designation exists to flag these proteins for **executive-level attention** and track their overuse specifically. A 5% overpour of Picanha has dramatically more financial impact than a 5% overpour of chicken.

Villain tracking is not about demonizing proteins — it is a cost concentration tool. The system intentionally separates Villain performance from the aggregate lbs/guest metric so that executives can isolate the financial signal from the volume noise.

#### Business Risk If Lost

If Villain classification is removed, simplified, or merged into a generic "premium protein" category, the executive dashboard loses its ability to surface cost concentration risk. A store systematically over-serving Picanha while under-serving chicken would appear to have normal aggregate numbers, hiding what could be a $3,000–5,000/week cost variance.

#### Recommendation for Institutionalization

- Document the protein list that qualifies as a Villain in a config file or `PROTEIN_CLASSIFICATION.md`
- Include the Pareto basis in the config comments: `// Villains: top proteins by cost. ~20-30% of volume, 60-80% of meat cost.`
- Make the Villain list operator-configurable (per tenant) rather than hardcoded — different chains have different cost profiles

---

### 2.2 The 80/20 Villain Approximation

| Field | Detail |
|---|---|
| **Risk Level** | 🟡 MEDIUM |
| **Current Location** | `MeatEngine.getExecutiveStats()` — Lines 634–635 |
| **Approximate Line** | `if (store.impactYTD > 0) { totalVillainLoss += store.impactYTD * 0.8; }` |

#### Operational Meaning

In `getExecutiveStats()`, the system calculates a network-level financial impact figure by assuming that **80% of any store's overspending is attributable to Villain proteins**. This `0.8` multiplier is an **operational heuristic from industry experience**, not a calculated or per-store figure.

It is used to produce executive dashboard impact summaries (e.g., "Your Villain proteins have cost the network $X YTD"). The figure is directionally accurate as a portfolio-level estimate but will not match a precise per-protein cost attribution audit.

#### Business Risk If Lost

The risk here is not that removing the `0.8` multiplier breaks operations — it is that a future engineer might replace it with a "more accurate" calculated figure from incomplete data, creating false precision. A calculated figure derived from incomplete cost data is *less* reliable than a calibrated heuristic. The bigger risk is an engineer who doesn't know this is a heuristic treating the output as an exact financial figure in investor reports.

#### Recommendation for Institutionalization

- Add a comment at lines 634–635: `// HEURISTIC: 0.8 = industry estimate that 80% of overspend is Villain-driven. Not calculated per-store. Do not treat as exact.`
- Add a tooltip or footnote in the executive dashboard UI: "Villain impact estimated using industry cost-concentration model"
- When per-store protein cost attribution becomes available from POS data, replace this with a calculated figure and remove this heuristic

---

## 3. Deployment & Operational Knowledge

---

### 3.1 Production Deployment Topology

| Field | Detail |
|---|---|
| **Risk Level** | 🟠 HIGH |
| **Current Location** | Railway project configuration, `Dockerfile`, `docker-compose`, `.env` |

#### Operational Meaning

The production system runs on the following topology, which is **not documented in any infrastructure-as-code**:

| Component | Technology | Notes |
|---|---|---|
| Backend | Railway (Docker container) | Managed via Railway dashboard + `git push` |
| Database | PostgreSQL via Prisma | Migrations run manually via `prisma migrate deploy` |
| Frontend | Vite static bundle | Deployed as static files |
| Job Queue | BullMQ with **in-memory mock Redis** | No persistent Redis — jobs are lost on server restart |
| Multi-tenancy | Subdomain routing | Managed via Railway env vars + CORS middleware |
| CI/CD | **None** | No automated tests or deployment pipeline |

**Critical note on Redis:** The current BullMQ implementation uses an in-memory Redis mock. This means:
- Queue jobs are **not persisted** across server restarts
- Any restart during a queued job (e.g., a long MeatEngine calculation) will silently drop that job
- This is invisible to operators — no error is surfaced when jobs are lost

**Multi-tenant subdomains** (e.g., `outback.brasameat.com`, `terra.brasameat.com`) are served from a single application instance. Tenant resolution happens at the CORS/middleware layer based on the incoming subdomain. Adding a new tenant requires manually updating Railway environment variables.

#### Business Risk If Lost

Without this knowledge, a new engineer or DevOps hire could:
- Spin up a second Railway instance assuming horizontal scaling is safe (it may not be with the current session model)
- Upgrade Redis from mock to persistent without understanding the BullMQ configuration implications
- Run `prisma migrate dev` in production instead of `prisma migrate deploy`, potentially resetting data
- Misconfigure a new tenant subdomain by touching the wrong layer of the stack

#### Recommendation for Institutionalization

- Create an `INFRASTRUCTURE.md` file documenting the full topology with environment variable names
- Add a `DEPLOYMENT_RUNBOOK.md` with step-by-step instructions for: new tenant onboarding, database migrations, frontend redeployment, and incident response
- See `DEPLOYMENT_REALITY.md` for the full operational maturity assessment

---

### 3.2 Seeded vs. Live Data Distinction

| Field | Detail |
|---|---|
| **Risk Level** | 🔴 CRITICAL |
| **Current Location** | Database — `store` table, seeding scripts |
| **Approximate Line** | Look for `seed`, `Dallas Pilot`, or synthetic data generation scripts |

#### Operational Meaning

The production database contains a mix of **seeded demo data** and **live operational data**. The distinction is currently enforced only by **founder knowledge** — there is no database flag, environment variable, or metadata field that marks a store as "demo" or "live."

Known seeded stores include:
- **Dallas Pilot** — populated with synthetic data to showcase the system during executive demos

When an enterprise demo is run, executives are seeing seeded realistic data, not real operational data. This is appropriate for demos. The risk is that the distinction exists only in the founder's memory.

#### Business Risk If Lost

If the founder is unavailable, any team member performing analysis, debugging, or reporting could:
- Treat demo data as real operational data, producing false performance benchmarks
- Include demo stores in aggregate network calculations, distorting company-level metrics
- Delete demo data believing it is outdated real data, breaking demo environments
- Conversely, treat real store data as demo data and modify it destructively

This is an existential data integrity risk for enterprise deployments.

#### Recommendation for Institutionalization

- Add a `data_type` field to the `store` table: enum `LIVE | DEMO | ARCHIVED`
- Update all MeatEngine calculations to filter by `data_type = 'LIVE'` by default
- Add a `DEMO_ENVIRONMENT.md` that lists all seeded store IDs and their purpose
- Create a checklist: "Before any company-level aggregate report, verify DEMO stores are excluded"

---

### 3.3 Inactive Store Risk

| Field | Detail |
|---|---|
| **Risk Level** | 🟠 HIGH |
| **Current Location** | MeatEngine — store iteration logic, `store` table |
| **Approximate Line** | Look for store query — absence of `WHERE status = 'ACTIVE'` filter |

#### Operational Meaning

The `store` table has a `status` field supporting at least `'INACTIVE'`. However, **MeatEngine does not filter by store status**. This means:

- Any INACTIVE store with residual data will appear in executive dashboards
- INACTIVE stores contribute to company-level aggregate calculations (total lbs, total cost, lbs/guest network average)
- There is no visual indicator in the dashboard that some contributing stores are operationally inactive

This is a **known issue** that has not yet been filed as a formal bug.

#### Business Risk If Lost

As the network grows and stores open, close, or enter temporary closure (renovations, seasonal), INACTIVE store data will increasingly contaminate network metrics. An executive reviewing "Network Average lbs/guest" would be looking at a figure that includes ghost data from closed locations. This directly impacts strategic decisions about expansion and cost management.

#### Recommendation for Institutionalization

- **File this as a bug immediately** (or track in the issue backlog)
- Add `WHERE status = 'ACTIVE'` to the MeatEngine's store query as a one-line fix
- Add a comment in MeatEngine: `// TODO: INACTIVE stores are NOT filtered — see FOUNDER_KNOWLEDGE_MAP.md §3.3`
- Consider adding a dashboard warning badge: "X inactive stores are currently included in this calculation"

---

## 4. Institutionalization Roadmap

The following prioritization is based on **consequence severity** (what breaks if this knowledge is lost) combined with **likelihood of encounter** (how soon a new engineer will touch this code).

### 🔴 Priority 1 — Do This Week (Risk: Immediate and Severe)

| # | Item | Action | Owner |
|---|---|---|---|
| 1 | **Seeded vs. Live Data** (§3.2) | Add `data_type` field to `store` table; document seeded store IDs | Founder |
| 2 | **Delivery Firewall** (§1.3) | Add inline comment + integration test | Founder or first engineer hire |
| 3 | **Garcia Rule Fail-Open** (§1.4) | Add comment in error handler; create `AUTHORIZATION_DECISIONS.md` | Founder |
| 4 | **INACTIVE Store Risk** (§3.3) | File formal bug; add `status = 'ACTIVE'` filter to MeatEngine | Founder |

### 🟠 Priority 2 — Do This Sprint (Risk: High, Triggered by First Engineer Hire)

| # | Item | Action | Owner |
|---|---|---|---|
| 5 | **Bacon Ratio** (§1.1) | Add inline derivation comment; create `MEAT_CONSTANTS.md` | First engineer |
| 6 | **Gaucho Chicken Bound** (§1.2) | Add inline comment + unit test | First engineer |
| 7 | **Wednesday Lock Rule** (§1.7) | Add named constant + comment at line 77 + unit test | First engineer |
| 8 | **Beef Ribs Sentinel Threshold** (§1.5) | Add inline comment + `SENTINEL_CALIBRATION_LOG.md` | First engineer |
| 9 | **Villain Classification** (§2.1) | Move protein list to config; add `PROTEIN_CLASSIFICATION.md` | First engineer |
| 10 | **Deployment Topology** (§3.1) | Create `INFRASTRUCTURE.md` + `DEPLOYMENT_RUNBOOK.md` | Founder |

### 🟡 Priority 3 — Do This Quarter (Risk: Medium, Triggered by Scale)

| # | Item | Action | Owner |
|---|---|---|---|
| 11 | **Systemic Variance Threshold** (§1.6) | Move to config object; create `SENTINEL_CALIBRATION_LOG.md` | First engineer |
| 12 | **80/20 Villain Approximation** (§2.2) | Add heuristic annotation; add dashboard footnote | First engineer |

---

> **Note to future engineers:** Every constant, threshold, and filter in this system was calibrated against real restaurant operations — not invented at a desk. Before changing any value, ask: "What real-world behavior does this encode, and who validated it?" When in doubt, consult this document first.
