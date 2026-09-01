# BRASA MASTER CONTEXT
## BRASA HQ — Central Strategic Memory Repository
### Phase 1.5 — Authoritative Operating Memory System (V2 Refined)

**Document Version:** 2.0.0  
**Classification:** Enterprise Strategic Confidential  
**Owner:** Platform Engineering & Strategic Operations  
**Last Reviewed:** 2026-05-26  
**Status:** RATIFIED  

---

## 1. Executive Summary

The **BRASA Master Context** is the central, multi-dimensional database of organizational memory, operational parameters, and deployment protocols for BRASA Meat Intelligence™. This document consolidates our company identity, telemetry philosophy, product modules, pricing structures, deployment constraints, and sales positioning into a single corporate handbook. 

It is designed to act as the primary operational context for senior hires, developers, partners, and AI development agents. By establishing a unified strategic truth layer, it ensures that all business actions, product engineering decisions, and client engagements are aligned with the physical and financial realities of enterprise meat governance.

---

## 2. Company Identity

BRASA Meat Intelligence™ is **operational telemetry infrastructure and an enterprise-grade chain-of-custody truth engine**. We do not build simple software tools or generic restaurant dashboards. 

Our platform secures high-value protein assets for multi-unit hospitality networks by capturing and validating physical transactions at the exact moment they occur. We serve as the permanent evidence-preservation layer that turns the chaos of back-of-house restaurant operations into structured, auditable digital telemetry, protecting enterprise EBITDA and recovering gross margin.

---

## 3. Core Operational Problem

In high-volume restaurant groups, food cost represents the largest variable expense (32–38%), and protein cost represents the largest share of that expense. Yet, the physical movement of meat is managed using paper logs, manual spreadsheets, and unvalidated inventory counts. This creates a severe profitability leak, driven by:
- **Vendor Weight Discrepancies:** Distributors billing for theoretical case weights while delivering actual weights below spec (catch-weight drift).
- **Butcher Yield Inconsistencies:** Kitchen trim wastage exceeding portion guidelines due to sub-spec fatty cuts or poor knife work.
- **Table Portion Overpouring:** Serving staff carving portions that exceed rodizio targets.
- **Internal Variance:** Unrecorded waste, undocumented overrides, and inventory shrinkage.

Combined, these leaks account for **2–4% of gross margin loss**, which represents a major variable leak in restaurant EBITDA.

---

## 4. Operational Blindspot Thesis

Traditional restaurant groups manage food cost retrospectively. Corporate headquarters review profit and loss (P&L) statements, invoice records, and weekly inventory counts weeks after the service occurs. This creates a **core operational blindspot**:
- Headquarters sees *what* the cost percentages are, but cannot see *why* deviations occurred.
- There is no real-time validation of actual box weight at the delivery dock.
- There is no station-level monitoring of trim yields at the butcher block.
- There is no record of who authorized specification overrides or why.

BRASA eliminates this blindspot by providing real-time, scale-locked, and audit-ready telemetry directly to the corporate office.

---

## 5. Telemetry Philosophy

**“If telemetry is not captured at the operational moment, the organization is no longer managing reality — only historical interpretation.”**

Retrospective logs are subject to human error, forgetfulness, and data manipulation. To maintain absolute data integrity, BRASA enforces **moment-of-execution telemetry capture**:
- Scanners capture box labels at the exact moment of delivery.
- Calibrated kitchen scales record block weights before and after butcher trim.
- The system prevents data commits unless physical barcode scans or scale readings are verified, locking out manual entries that cannot be audited.

---

## 6. Governance Philosophy

Operational discipline cannot rely on manager diligence. It must be enforced via system rules, strict compliance windows, and auditable escape valves:
- **Programmatic Gates:** The system locks edit access to operational dashboards if weekly inventory is not submitted before Monday at 11:00 AM local time.
- **Exemption Windows:** Guest forecasts are frozen on Wednesday of the prior week, forcing store managers to plan purchasing rather than reacting to daily swings.
- **Supervisor Responsibility:** Overrides are not blocked; they are signed with supervisor credentials and text reasons, contributing directly to a composite risk score.

---

## 7. Evidence Preservation Philosophy

Every data point captured by the BRASA platform is treated as **audit-ready evidence**:
- Records are saved as immutable database rows.
- Modifications do not overwrite historic values; they write new delta records, maintaining a complete log of changes.
- Subdomain-based CORS controls and database constraints isolate data per tenant (`company_id`).
- In the event of supplier billing disputes or internal reviews, BRASA serves as the definitive, secure system of record proving the physical chain of custody.

---

## 8. Chain-of-Custody Philosophy

To guarantee data integrity, the platform traces proteins sequentially through four gates:
1. **Intake (Receiving Event):** Verifying scanned barcodes, OCR label text, and PO weights at the delivery dock.
2. **Storage (Inventory Cycle):** Tracking physical cold storage counts on a strict weekly cadence.
3. **Preparation (Trim Record Event):** Monitoring raw weight input against usable portion yield at the butcher station.
4. **Consumption (POS Cover Report):** Computing actual portions served against POS guest counts, isolating dine-in from delivery.

---

## 9. Primary Product Modules

BRASA OS is divided into three primary integrated modules:
1. **Receiving Console:** The dock-level application used to scan barcodes, capture label photos, and validate catch-weight box weights against PO specifications.
2. **Prep/Trim Monitor:** The kitchen station display used by butchers to log raw meat block weights, trim weights, and yield percentages.
3. **Executive BI Console:** The corporate oversight portal showing multi-store portion performance, supplier confidence indexes, compliance alert summaries, and calculated EBITDA recovery.

---

## 10. Receiving Telemetry Layer

- **Function:** Captures product data at the delivery dock.
- **Origin:** Scanner terminal or mobile camera capturing labels on incoming boxes.
- **Processing:** `BarcodeParserRouter` parses GS1-128 or EAN barcodes. Mismatches or out-of-spec weights route the box to a `REVIEW_REQUIRED` compliance status.
- **Persistence:** Written to `ReceivingEvent` and `BarcodeDecisionLog` tables, linked to `InboundLineUnit` and `Store`.

---

## 11. Yield Intelligence Layer

- **Function:** Captures butcher yield efficiency.
- **Origin:** Kitchen scale logs at the butcher station.
- **Processing:** `YieldEngine.ts` calculates actual vs. expected yield percentages per cut. Yields outside standard parameters (e.g. <50% or >100%) trigger quarantine flags.
- **Persistence:** Written to `TrimRecordEvent` and `AiYieldInsight` tables.

---

## 12. Forecast Intelligence Layer

- **Function:** Captures demand forecasting and order recommendations.
- **Origin:** Store manager inputs or programmatically calculated baselines.
- **Processing:** `TripleBaselineService.ts` aggregates historical guest counts to recommend prep plans, freezing changes after the Wednesday deadline.
- **Persistence:** Saved in `SalesForecast`, `ForecastIntelligenceLog`, and `OutletForecastLog` tables.

---

## 13. Consumption Intelligence Layer

- **Function:** Computes actual portions consumed.
- **Origin:** Ingested check transaction logs from the POS.
- **Processing:** `MeatEngine.ts` iterates through active stores, aggregates start/end inventory and net receiving weights, subtracts delivery volume, and divides by dine-in guest covers.
- **Persistence:** Written to `MeatUsage` and `PilotDailyAudit` tables.

---

## 14. Compliance & Override Layer

- **Function:** Logs process deviations and administrative approvals.
- **Origin:** Supervisor portal actions.
- **Processing:** `RiskEnforcementEngine.ts` and `FraudIntelligenceEngine.ts` assign risk scores (e.g. +60 for `EXECUTIVE_FORCE_OVERRIDE`) based on manual overrides.
- **Persistence:** Written to `ReceivingEvent.override_flag` and `AuditLog` tables.

---

## 15. Alerting & Escalation Layer

- **Function:** Automated auditing of telemetry entries.
- **Origin:** Continuous background worker loops.
- **Processing:** `PilotSentinelAgent.ts` scans database records for fat-finger errors (<0.8 or >3.0 lbs/guest), order anomalies, and systemic supplier weight shortfalls.
- **Persistence:** Creates `SystemAlert` and `PilotDailyAudit` records.

---

## 16. Executive Visibility Layer

- **Function:** Surfaces portfolio performance to corporate leaders.
- **Origin:** Aggregate database queries scoped to the tenant company.
- **Processing:** `ExecutiveMetricsService.ts` compiles network-level averages, supplier rankings, and YTD financial impact figures.
- **Persistence:** Surfaces data dynamically in the Executive BI Console.

---

## 17. Pilot Philosophy

We do **not** conduct pilots to show off features or get feedback on UI buttons. **A pilot is a structured, 30-day operational stop-loss recovery assessment.** 
- The target is to establish a **targeted ROI validation framework** to identify measurable margin recovery opportunities within 30 days.
- The pilot begins with a "Silent Mode" week to establish a true baseline anomaly rate and weight variance without active alerts.
- Success is measured by actual weight variances resolved and invoice credits secured from suppliers.

---

## 18. Deployment Methodology

Our deployment methodology is structured to minimize IT friction and establish operational discipline:
1. **Pre-Pilot Calibration:** Verify POS report endpoints (Aloha, Toast, etc.). Ensure CORS access is configured for the target tenant's subdomains.
2. **Hardware Delivery:** Send pre-configured BRASA mobile scanner kits to the target dock. Verify cellular or local Wi-Fi connectivity at the receiving area.
3. **Database Provisioning:** Create the `Company`, `Store`, `User`, and `CorporateProteinSpec` records in the database. Ensure all active protein cuts are associated with the correct spec weights.

---

## 19. Rollout Methodology

Deployments are executed in three structured waves to manage operational change:
- **Wave 1: Calibration (2 stores, 4 weeks):** Validate POS integrations, configure supplier barcode rules, and establish baseline weight variances.
- **Wave 2: Regional Rollout (10–20 stores, 8 weeks):** Activate the Monday 11:00 AM lockout and the Wednesday forecast deadline. Enable Sentinel audits.
- **Wave 3: Enterprise Integration (Full network conversion):** Connect automated scale interfaces and sync receiving logs directly with corporate ERP systems.

---

## 20. ICP (Ideal Customer Profile)

- **Corporate Scale:** Multi-unit operators managing 10 to 200+ high-volume locations.
- **Operational Format:** High-protein, upscale casual, buffet, or rodizio-style service models where protein cost represents >35% of total operating expenses.
- **Pain Points:** High unexplained inventory variance, lack of standard receiving controls, supplier dispute friction, and reliance on founder-led or manager-dependent processes.
- **Decision Makers:** VPs of Operations, Chief Financial Officers, Directors of Procurement, and Directors of Quality Assurance.

---

## 21. Primary Enterprise Targets

Our active sales efforts are concentrated on the following accounts:
- **Hard Rock Cafe:** *Strategic engagement under evaluation.* Focus is on establishing Aloha POS integration and calibrating weekly dashboards.
- **Terra Gaucha & Adega Gaucha:** *Operational calibration environment.* Serving as calibration environments to validate the Delivery Firewall and portion caps.
- **Texas de Brazil & Fogo de Chão:** *Enterprise relationship under development.* The primary B2B rodizio networks where margin recovery will prove industry-wide market fit.
- **Bloomin' Brands:** *Strategic target.* The gateway to enterprise scale via Outback Steakhouse and Fleming's networks.

---

## 22. B2B vs B2G Positioning

- **Primary Focus: B2B Enterprise Hospitality Networks:** Commercial restaurant groups are our immediate operational focus. They consume massive volumes of catch-weight meats weekly, making the ROI of stop-loss telemetry immediate.
- **Long-Term Vector: B2G Public Food Procurement:** Public feeding operations (school districts, military facilities) requiring auditable compliance to protect public funds. Note: This is a future compliance market, not a current operational focus.

---

## 23. Pricing Philosophy

We do **not** price BRASA as cheap SaaS software or charge per seat (which limits user adoption and corporate visibility). **We position BRASA as enterprise operational telemetry infrastructure.** 

Our commercial model aligns with the physical volume of assets protected: we charge a value-based fee per pound of protein tracked, or a flat monthly compliance fee per location backed by a **targeted ROI validation framework** in stop-loss margin recovery.

---

## 24. Current Pricing Structure

Our standardized pricing structure for enterprise accounts is defined below:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ENTERPRISE PRICING MODEL                        │
├──────────────────────┬─────────────────────────────────────────────────┤
│     FEE CATEGORY     │                 PRICING STRUCTURE               │
├──────────────────────┼─────────────────────────────────────────────────┤
│ 1. One-Time Pilot    │ - $1,550 per store (deployment & calibration)   │
│                      │ - Covers 30-day diagnostic + scanner hardware   │
├──────────────────────┼─────────────────────────────────────────────────┤
│ 2. Implementation    │ - $1,200 per store (custom POS integrations)   │
│                      │ - One-time setup fee for post-pilot rollout     │
├──────────────────────┼─────────────────────────────────────────────────┤
│ 3. Monthly Rollout   │ - Custom Enterprise Governance Pricing          │
│    (Subscription)    │   - Calibrated per deployment complexity,      │
│                      │     telemetry scope, and integration scale.      │
└──────────────────────┴─────────────────────────────────────────────────┘
```

---

## 25. Pilot Pricing Structure

- **Structure:** 3-store pilot preferred (operational validation, not a SaaS trial).
- **Setup Fee:** **$1,550 per store** (one-time operational deployment & calibration fee).
- **Scope:** Includes mobile scanner terminal delivery, database configuration, POS report mapping, and a 30-day baseline vs. active telemetry audit report.
- **Value Proposition:** Structured as an operational stop-loss recovery assessment to validate measurable margin recovery opportunities.

---

## 26. Rollout Pricing Structure

- **Structure:** Custom Enterprise Governance Pricing.
- **Pricing Variables:** Enterprise pricing is calibrated based on deployment complexity, telemetry scope, integration depth, governance requirements, support SLAs, operational footprint, and implementation scale.
- **SLA Options:** Enterprise support tiers (Bronze, Silver, Gold) are available, scaling from 8/5 next-day support to 24/7 dedicated SRE coverage.

---

## 27. Enterprise Tiering Philosophy

Our pricing tiers are designed to incentivize client expansion and integration depth:
- **Tier 1: Core Telemetry (Receiving Only):** Basic dock scanning and manual POS upload. Focuses on supplier weight verification.
- **Tier 2: Production Governance (Receiving + Yield):** Adds kitchen scale integrations and trim monitoring. Focuses on butcher yield optimization.
- **Tier 3: Full Enterprise Integration (API + ERP):** Integrates live POS webhooks and automatic receiving logs directly with corporate ERP systems (e.g. SAP, NetSuite).

---

## 28. Operational Deployment Constraints

Our current deployment model is subject to technical constraints that limit scalability:
- **Sequential Calculations:** `MeatEngine.ts` processes stores sequentially in a `for` loop, which will cause calculation latency for tenants with 50+ locations.
- **Manual Migrations:** Database migrations must be executed manually from a local terminal using production connection strings.
- **No connection pooling:** Intensive engine calculation runs compete directly with real-time dashboard query loads on a single database connection pool.

---

## 29. Founder Constraints

The platform currently operates under a high degree of founder dependency (Bus Factor of 1):
- The founder manages all production deployments, custom DNS mappings, and domain environment variables.
- Tenant onboarding requires manual database seeding and configuration (2–4 hours manual labor per tenant).
- Seeded/demo databases (e.g., Dallas Pilot) coexist in the same PostgreSQL instance as live store databases, with no database flag distinguishing them.

---

## 30. Current Infrastructure Reality

- **Hosting:** Node.js backend and Vite static frontend deployed on Railway.
- **Database:** Single-instance PostgreSQL managed by Railway. No read replicas are implemented.
- **Queue:** BullMQ background queues configure an **in-memory mock Redis adapter** in production. Server restarts result in the silent loss of all queued jobs.
- **CI/CD:** None. Code changes are deployed via manual git pushes to the production Railway branch with no automated testing.

---

## 31. Current Enterprise Readiness Status

**Enterprise Readiness Score: 53 / 100**  
*(Functional and demo-ready. Gaps must be resolved before supporting multi-tenant enterprise scale.)*

### Critical Readiness Gaps
- **Observability:** `console.log` only; no APM or structured logging.
- **Redis Mock:** Queue jobs are not persistent, risking data corruption.
- **Mock Data Contamination:** Hardcoded values and `Math.random()` noise in `MeatEngine.ts` must be replaced with live database aggregations.
- **Test Coverage:** Near zero automated unit or integration tests.

---

## 32. AI Operating Model

AI is utilized selectively within the codebase to support deterministic verification:
- **OCREngine Interface:** Mapped to extract text values from box labels to verify printed weight against barcode data (currently mocked to return empty `{}`).
- **Pattern Detection Matrix:** Rule-based patterns in `FraudIntelligenceEngine.ts` check for weight cloning and override frequencies.
- **No Generative Fabrications:** We do not use generative models to predict or smooth metrics. All calculations are mathematical.

---

## 33. AI Role Segmentation Summary

To prevent development chaos, AI agents must adhere to strict roles (see `AI_ROLE_SEGMENTATION.md`):
- **Claude:** System Architect & Governance Writer (up-stream planner).
- **Antigravity (Current Agent):** Active Workspace Engineer (direct code/doc execution).
- **Gemini:** Deep Context Scanner & Log Auditor (diagnostic audits).
- **ChatGPT:** Ad-Hoc Scripting sandbox.
- **Notion AI:** Non-technical wiki editor.
- **GitHub Copilot:** Editor autocomplete assistant.

---

## 34. Sales Positioning Summary

Our sales messaging must shift buyers away from software comparisons:
- **The Shift:** Move the client from "What app features do you have?" to "How much EBITDA are you losing on unverified protein weight?"
- **The Anchor:** Position BRASA as a compliance framework that locks dock receiving gates and guarantees auditability, not a tool to make inventory "easy."
- **The Proof:** Lead with the 30-day pilot validation framework, demonstrating measurable margin recovery before proposing full enterprise rollouts.

---

## 35. Executive Objection Patterns

We address common enterprise objections using structured, operational responses:

* **Objection:** "Our managers are already too busy to scan boxes."  
  *Response:* "BRASA scans take under 3 seconds per box. It replaces the 20-minute manual paperwork verification process they already do."
* **Objection:** "We already have an inventory system."  
  *Response:* "Inventory systems track what you purchased vs. what you sold retrospectively. BRASA audits the physical chain-of-custody in real time to stop leakage before it becomes a historic inventory write-off."
* **Objection:** "We trust our suppliers; we don't need secondary dock scales."  
  *Response:* "Trust is not a control. Our pilot structured data demonstrates that even the most reliable distributors exhibit a 0.5–1.5% catch-weight shortage due to normal scale drift. BRASA automates that recovery verification."

---

## 36. Current Strategic Priorities

Our immediate technical priorities for the next 90 days are:
1. **Managed Redis:** Replace the in-memory mock Redis queue with a persistent managed Redis instance on Railway to prevent job loss.
2. **Data Segregation:** Add a `data_type` field to the `Store` database model and filter all MeatEngine queries accordingly to separate demo and live stores.
3. **Structured Logging:** Implement structured, level-based logging (using `pino`) routed to a central log aggregator.
4. **Mock Data Elimination:** Replace all hardcoded values in `MOCK_DATA_REGISTRY.md` with live database aggregations.

---

## 37. Current Strategic Risks

- **Alert Fatigue:** Sentinel alerts triggering too frequently on minor variances, leading store managers to ignore compliance lockouts.
- **Single-Point-of-Failure:** All server routes and boot logic are consolidated in `server/src/index.ts` (30KB). Casual modifications risk breaking authentication or tenant routing.
- **Manual Migration Failures:** Running schema updates from local terminals against the production database, risking data resets or table locks.

---

## 38. Long-Term Infrastructure Vision

As global supply chains face increasing regulatory oversight and margin pressure, BRASA OS will position itself as the **central compliance and transaction visibility layer for cold-chain high-value assets**. By proving the exact weight, source, and yield of every protein unit from packer to plate, BRASA will provide the physical and digital verification layer that secures private margins and public compliance tracking.

---

## 39. Institutionalization Objectives

We are committed to extracting implicit founder knowledge and converting it into documented, repeatable corporate assets. This involves:
- Writing step-by-step incident response, migration, and deployment runbooks.
- Implementing automated unit tests for every critical operational heuristic in `MeatEngine.ts`.
- Standardizing the onboarding and training process for new enterprise pilots.

---

## 40. Current 12-Month Mission

The mission for the next 12 months is to **stabilize the core infrastructure, eliminate mock data, and execute the Hard Rock and Terra Gaucha calibration environments successfully.** We will not expand into new product verticals or target low-margin SMBs. We will focus entirely on proving margin recovery, reducing founder dependency, and building the technical credibility necessary to support our first 10 enterprise clients.

---

*This document is the supreme operational context of BRASA Meat Intelligence™. All engineering, operational, and commercial activities must align with its principles. Strategic changes require formal approval from the Strategic Leadership Team.*

*BRASA HQ — BRASA MASTER CONTEXT: Strategic Operating System Directive*
