# MOCK DATA REGISTRY
## BRASA Meat Intelligence OS — Phase 1.5: Operational Intelligence Preservation

> **Purpose:** This document catalogs every hardcoded value, mock metric, `Math.random()` usage, placeholder output, and demo assumption currently present in the production codebase. It exists to ensure that none of these values are ever presented as live operational data during enterprise demos, investor conversations, or technical due diligence reviews.

> **Policy:** No item on this list may appear in any dashboard, report, or data export during a C-Level demo, investor data room session, or external technical review unless it has been explicitly resolved and checked off in the Pre-Flight Checklist at the end of this document.

---

**Last Updated:** 2026-05-26  
**Maintained By:** Engineering / Data Integrity  
**Status:** ACTIVE — 11 unresolved entries

---

## Registry Entries

---

### MOCK-001 — Hardcoded Network Yield

| Field | Detail |
|---|---|
| **File** | `engine/MeatEngine.ts` |
| **Lines** | 370–371 |
| **Function** | `getNetworkBiStats()` |
| **Urgency** | 🔴 CRITICAL |

**Code**
```typescript
networkYield: 98.4,
unaccountedCost: 45200.50
```

**What It Shows**  
A `98.4%` network yield and `$45,200.50` unaccounted cost figure. These are the primary KPIs surfaced on the executive dashboard under the Network Business Intelligence panel.

**Risk to Demo**  
Any C-Level or enterprise reviewer watching the dashboard live will see these values presented as real-time operational performance. There is no visible indicator that the data is static or mocked.

**Risk to Investor / Enterprise Review**  
A `98.4%` yield is an exceptionally high number. If an investor or analyst benchmarks this against industry norms (typically 85–95% depending on cut and operation type), it will either raise questions about authenticity or inflate perceived operational performance ahead of a funding round. The `$45,200.50` unaccounted cost figure, if seen in a data room, will appear as a real liability metric.

**Risk to Telemetry Integrity**  
These values are returned unconditionally by `getNetworkBiStats()`. Any downstream analytics, alerting, or reporting pipeline that calls this function receives fabricated KPIs. Historical trend analysis built on top of this function will compound the inaccuracy over time.

**Recommended Replacement Strategy**  
Implement `getNetworkBiStats()` to aggregate real yield data from all active tenant store records. Network yield should be computed as `(totalConsumed / totalPurchased) * 100` derived from actual inventory movement records. Unaccounted cost should be derived from variance records in the database. Until real aggregation is built, this function must not be called by any UI component that is visible in demo or production environments.

---

### MOCK-002 — Hardcoded Weekly Chart Data

| Field | Detail |
|---|---|
| **File** | `engine/MeatEngine.ts` |
| **Lines** | 327–336 |
| **Function** | `getWeeklyHistory()` |
| **Urgency** | 🟠 HIGH |

**Code**
```typescript
// Static return — always returns this array regardless of store or date range
{ day: 'Mon', value: 450 },
{ day: 'Tue', value: 520 },
{ day: 'Wed', value: 480 },
{ day: 'Thu', value: 610 },
{ day: 'Fri', value: 750 },
{ day: 'Sat', value: 890 },
{ day: 'Sun', value: 720 }
```

**What It Shows**  
A weekly trend chart displayed on the main dashboard. The pattern always shows a consistent ramp from Monday to Saturday with a Sunday dip — the same shape for every store, every week.

**Risk to Demo**  
Any reviewer who navigates between stores or changes the date range will immediately observe that the chart does not change. This is a high-visibility red flag in any live demo scenario.

**Risk to Investor / Enterprise Review**  
If this chart is included in any PDF export or screenshared report, the data will appear as real weekly operational throughput. A savvy reviewer may notice that the values are suspiciously round and identical across different locations.

**Risk to Telemetry Integrity**  
Low direct impact — this is a display-layer function — but any analytics or forecasting models that consume `getWeeklyHistory()` output will be trained on completely fabricated demand curves.

**Recommended Replacement Strategy**  
Query actual daily intake/consumption records grouped by day of week for the selected store and date range. The function signature already accepts a date range parameter (or should be updated to do so). Fall back to a clearly labelled "No data available" state rather than returning static placeholder values.

---

### MOCK-003 — Hardcoded Network Report Card Values

| Field | Detail |
|---|---|
| **File** | `engine/MeatEngine.ts` |
| **Lines** | 383–410 |
| **Function** | `getNetworkReportCard()` |
| **Urgency** | 🔴 CRITICAL |

**Code**
```typescript
costPerGuest: 11.20,
lbsPerGuest: 1.85,
planLbsPerGuest: 1.76,
lbsPerGuest12UkAvg: 1.82,
lbsPerGuestPTD: 1.84,
lbsPerGuestYTD: 1.83,
planLbsPerGuestYTD: 1.76,
impactYTD: -125000
```

**What It Shows**  
A complete network-level report card including per-guest cost, portion yield per guest (actual vs. plan), 12-week and period-to-date averages, and a year-to-date financial impact figure of **−$125,000**.

**Risk to Demo**  
The `$125,000` impact figure is the most dangerous value in this entire registry. If shown to a C-Level executive, it will be interpreted as a real, auditable operational savings or loss figure. It will likely be quoted in follow-up conversations or included in internal reports by the enterprise prospect.

**Risk to Investor / Enterprise Review**  
This is a data room liability. The combination of per-guest KPIs and a YTD financial impact figure presented to an investor — without a clear disclaimer — constitutes materially misleading data if the company is in an active funding process.

**Risk to Telemetry Integrity**  
Every KPI in this block is fabricated. All trend analysis, benchmarking, and plan-vs-actual reporting built on this function produces meaningless output.

**Recommended Replacement Strategy**  
Each of these metrics must be computed from real records: guest counts from POS integrations or manual report inputs, purchase records from intake logs, and plan values from the configured operational targets per tenant. Until real computation exists, `getNetworkReportCard()` must return a clearly typed `MockDataResponse` that is blocked from rendering in any externally visible view.

---

### MOCK-004 — Hardcoded Company Aggregate Stats

| Field | Detail |
|---|---|
| **File** | `engine/MeatEngine.ts` |
| **Lines** | 412–419 |
| **Function** | `getCompanyAggregateStats()` |
| **Urgency** | 🟠 HIGH |

**Code**
```typescript
totalPurchased: 154000,
totalConsumed: 151500,
yieldPercentage: 98.37
```

**What It Shows**  
Company-wide aggregate purchasing volume (154,000 lbs), consumption volume (151,500 lbs), and an overall yield of `98.37%`.

**Risk to Demo**  
These appear as the top-level company health metrics. In a dashboard demo, they immediately convey scale and efficiency — both of which are completely fabricated.

**Risk to Investor / Enterprise Review**  
A `98.37%` yield at company aggregate level is an extraordinary claim. Any meat industry expert or operational due diligence reviewer will immediately flag this as implausible or will request the underlying data to verify it. The purchasing volume (154,000 lbs) implies a specific scale of operations that may not match other data points in the company narrative.

**Risk to Telemetry Integrity**  
If `getCompanyAggregateStats()` is called by any export, reporting, or alerting pipeline, the fabricated scale and yield figures will propagate into all downstream outputs.

**Recommended Replacement Strategy**  
Aggregate `totalPurchased` and `totalConsumed` from real intake and consumption records across all active tenant stores for the selected period. `yieldPercentage` must be a derived computation, never a hardcoded value. Implement a database-level aggregation query for this function.

---

### MOCK-005 — `Math.random()` in Alacarte Store Performance Props

| Field | Detail |
|---|---|
| **File** | `engine/MeatEngine.ts` |
| **Lines** | 594–598 |
| **Function** | Alacarte store performance prop generation |
| **Urgency** | 🔴 CRITICAL |

**Code**
```typescript
actualYieldPct: 78.4 + (Math.random() * 5 - 2.5),
portionVariancePct: 3.5 + (Math.random() * 2 - 1),
priceDriftPerLb: 1.15 + (Math.random() * 0.5 - 0.25),
executionImpact: -4500 + (Math.random() * 2000 - 1000)
```

**What It Shows**  
Randomized store-level performance metrics for ALACARTE operation type tenants, including yield percentage, portion variance, price drift per pound, and execution impact in dollars.

**Risk to Demo**  
This is the most immediately detectable mock in the codebase during a live demo. The numbers visibly change on every page refresh. A technical reviewer watching the screen will notice the values shifting — this immediately and irrecoverably signals that the data is not real. No explanation recovers from this during a live demo.

**Risk to Investor / Enterprise Review**  
If a screenshot is taken during one session and compared to another (e.g., in a follow-up meeting), the numbers will not match. This creates a provable inconsistency in any data room review.

**Risk to Telemetry Integrity**  
Any performance trend, alerting threshold, or anomaly detection system that reads these values will receive non-deterministic inputs on every evaluation cycle. This makes the system non-auditable.

**Recommended Replacement Strategy**  
Replace all four `Math.random()` expressions with real computed values from store records. If real data is not yet available for a given tenant, return `null` for these fields and render them as "Data Unavailable" in the UI. Under no circumstances should `Math.random()` be used for any metric that appears in a user-facing dashboard.

---

### MOCK-006 — `Math.random()` in Guest Count Noise

| Field | Detail |
|---|---|
| **File** | `engine/MeatEngine.ts` |
| **Lines** | 503–511 |
| **Function** | Guest count computation (fallback and main path) |
| **Urgency** | 🟠 HIGH |

**Code**
```typescript
const noise = (Math.random() - 0.5) * 0.1;
guests = Math.round(guests * (1 + noise));
```

> ⚠️ **Note:** This noise is applied **twice** — once in the fallback path when no report data exists, and **once unconditionally** even when real guest data has been loaded from the report. This means actual guest counts from real POS or report inputs are being randomly perturbed by ±5% on every page load.

**What It Shows**  
Every guest count metric shown in the dashboard is artificially modified by up to ±5% relative to its source value. This affects all per-guest KPIs (cost per guest, lbs per guest, etc.) that are derived from guest count.

**Risk to Demo**  
Guest count is a foundational metric. If a demo reviewer refreshes the page or navigates between views, all per-guest KPIs will shift — even if the underlying report data is unchanged. This is a subtle but detectable inconsistency.

**Risk to Investor / Enterprise Review**  
This is a **telemetry integrity issue**, not merely a demo risk. If an enterprise client or investor audits the system and compares dashboard-displayed guest counts against source POS records, they will find a systematic ±5% discrepancy with no documented business rationale.

**Risk to Telemetry Integrity**  
🔴 **This is the highest telemetry integrity risk in the registry.** Real data is being corrupted at the display layer. Any historical trend, period comparison, or plan-vs-actual report that includes guest-derived KPIs is built on randomly perturbed inputs. This affects real operational decisions if any store operator is using the dashboard to manage their business.

**Recommended Replacement Strategy**  
Remove the noise injection entirely from both code paths. Guest counts must be passed through unchanged from their source (report upload, POS integration, or manual entry). If statistical smoothing is a legitimate product feature, it must be documented, configurable per tenant, and not applied silently using `Math.random()`.

---

### MOCK-007 — Hardcoded Network Report Card ALACARTE Props

| Field | Detail |
|---|---|
| **File** | `engine/MeatEngine.ts` |
| **Lines** | 406–408 |
| **Function** | `getNetworkReportCard()` — ALACARTE-specific fields |
| **Urgency** | 🟡 MEDIUM |

**Code**
```typescript
boxPriceDrift: 1.15,
trimYieldPct: 78.4,
specTargetYield: 85.0
```

**What It Shows**  
ALACARTE-specific network metrics: box price drift per pound, trim yield percentage, and specification target yield. These appear alongside real network data in the report card for ALACARTE operation type tenants.

**Risk to Demo**  
These values are less prominently featured than the main report card KPIs (MOCK-003) but are still visible to any reviewer who drills into the ALACARTE-specific panel.

**Risk to Investor / Enterprise Review**  
Medium risk. A `78.4%` trim yield is a plausible value for many ALACARTE operations, so it may not immediately trigger suspicion. However, `specTargetYield: 85.0` presented as an objective benchmark implies that the system is measuring against a configured operational target — which it is not.

**Risk to Telemetry Integrity**  
Medium. These values are static, so at least they are deterministic. However, they will suppress any real signal about actual trim yield or price drift trends.

**Recommended Replacement Strategy**  
Pull `trimYieldPct` from real trim and yield records for ALACARTE tenants. `specTargetYield` should be a configurable value set per tenant in their operational profile, not a hardcoded constant. `boxPriceDrift` should be computed from actual purchase price history against baseline or plan price.

---

### MOCK-008 — Simulated Delay in Intake Worker

| Field | Detail |
|---|---|
| **File** | `workers/intakeQueue.ts` |
| **Line** | 44 |
| **Urgency** | 🟡 MEDIUM |

**Code**
```typescript
// Simulated Intensive Work Delay (OCR, AI Matching, File Sync)
await new Promise(resolve => setTimeout(resolve, 2000));
```

**What It Shows**  
Every job processed by the intake queue is artificially delayed by 2,000 milliseconds (2 seconds) regardless of actual processing time.

**Risk to Demo**  
Low direct data integrity risk, but a perceptible 2-second lag on every intake event will make the system feel slow during a live demo. If a reviewer submits multiple intake events in rapid succession, the queue will back up visibly.

**Risk to Investor / Enterprise Review**  
Low. This is unlikely to be visible in a data room context. However, if performance benchmarks or SLAs are discussed and the queue throughput is measured, this 2-second floor will compress every throughput claim.

**Risk to Telemetry Integrity**  
Low for data accuracy, but significant for performance benchmarking. Any queue throughput or processing time telemetry collected while this delay is active will reflect artificial latency, not real engine performance.

**Recommended Replacement Strategy**  
Remove the `setTimeout` entirely. Implement actual OCR, AI matching, and file sync logic (or clearly stub those steps without artificial delay). If a loading/processing state is needed for UX purposes, implement it at the UI layer with a real status indicator, not a backend delay.

---

### MOCK-009 — Mocked Intake Worker Output

| Field | Detail |
|---|---|
| **File** | `workers/intakeQueue.ts` |
| **Lines** | 53–59 |
| **Urgency** | 🟠 HIGH |

**Code**
```typescript
parsed_output: { msg: 'parsed' },
normalized_output: { msg: 'normalized' },
validation_output: { msg: 'success' }
```

**What It Shows**  
The intake worker writes placeholder parsed, normalized, and validation output objects to the database for all processed `GoldenDatasetItems`. The actual content of these fields — which represent the intelligence layer output — is always the string `'parsed'`, `'normalized'`, and `'success'`.

**Risk to Demo**  
Low visibility during normal dashboard use, but immediately exposed if any reviewer opens the database or inspects raw records via any admin panel or data export.

**Risk to Investor / Enterprise Review**  
🔴 **This is a critical data room risk.** If a technical due diligence reviewer queries the database directly — a standard practice in enterprise software evaluations — they will find that the core intelligence layer outputs are string literals. This completely undermines any claim about the AI processing pipeline's functionality.

**Risk to Telemetry Integrity**  
All records processed through the intake queue contain non-functional intelligence output. Any downstream system that reads `parsed_output` or `normalized_output` to make decisions will be reading meaningless data.

**Recommended Replacement Strategy**  
Implement real parsing, normalization, and validation logic in the intake worker. Until real logic is ready, these fields should either be omitted from the database write entirely or populated with a clearly typed stub structure (e.g., `{ status: 'PENDING_IMPLEMENTATION', version: '0.0.0' }`) that is programmatically distinguishable from real output. Never write human-readable mock strings like `'parsed'` to a production database field.

---

### MOCK-010 — OCR Engine — Mocked Extraction

| Field | Detail |
|---|---|
| **File** | `services/LabelDataFusionEngine.ts` |
| **Lines** | 17–20 |
| **Function** | `OCREngine.extract()` |
| **Urgency** | 🟠 HIGH |

**Code**
```typescript
// Mocked implementation for now, returning empty safely.
public static async extract(imageUrl: string, context?: any): Promise<OCRExtractedData> {
  return {};
}
```

**What It Shows**  
The OCR extraction engine — responsible for reading label image data — always returns an empty object. No image processing occurs.

**Risk to Demo**  
Any demo scenario involving image-based ticket reading or label scanning will silently return no data. The downstream fusion engine will fall back to GS1 barcode data only. If the demo script includes showing the AI Vision extraction feature, it will not function.

**Risk to Investor / Enterprise Review**  
If the AI Vision / OCR feature is mentioned in any pitch deck, capability document, or product roadmap, and a reviewer attempts to test it during evaluation, the feature will silently fail to extract anything. There will be no error — just empty fields — which is harder to explain than an explicit error state.

**Risk to Telemetry Integrity**  
Any `OCRExtractedData` field populated downstream of this function will always be empty. All fusion records that depend on OCR input will be built entirely on barcode data, which may not be disclosed accurately in any data quality documentation.

**Recommended Replacement Strategy**  
Integrate a real OCR backend (e.g., Google Cloud Vision API, AWS Textract, or a self-hosted Tesseract pipeline). Until integration is complete, the function should throw a clearly typed `NotImplementedError` or return a typed stub with `{ status: 'OCR_NOT_IMPLEMENTED' }` so that downstream consumers can handle the absence of OCR data explicitly rather than silently treating it as "no text on label."

---

### MOCK-011 — Supplier Behavior Profile Placeholders

| Field | Detail |
|---|---|
| **File** | `services/FraudIntelligenceEngine.ts` |
| **Lines** | 177–178 |
| **Function** | Supplier behavior profile generation |
| **Urgency** | 🟡 MEDIUM |

**Code**
```typescript
weightVariancePenalty: 0, // Placeholder
overrideFrequency: 0,     // Placeholder
```

**What It Shows**  
Two supplier behavior scoring metrics — weight variance penalty and override frequency — are hardcoded to `0` for all suppliers. These fields are part of the supplier behavior profile that feeds the Fraud Intelligence Engine.

**Risk to Demo**  
Medium. Supplier profiles showing `0` for both metrics will cause all suppliers to appear as having no weight variance issues and no override behavior — an unrealistically clean profile.

**Risk to Investor / Enterprise Review**  
If the Fraud Intelligence Engine is presented as a differentiating capability, reviewers who examine supplier profiles will see that two of the behavioral scoring inputs are non-functional. This weakens the credibility of the fraud detection feature.

**Risk to Telemetry Integrity**  
Any fraud risk score, supplier ranking, or anomaly alert that depends on `weightVariancePenalty` or `overrideFrequency` will be systematically under-scoring all suppliers. Real fraudulent behavior patterns will not be detected by these two signals.

**Recommended Replacement Strategy**  
`weightVariancePenalty` should be computed from the distribution of weight variances in historical intake records for each supplier. `overrideFrequency` should be computed from the count of manual overrides or adjustments applied to records attributed to each supplier. Both computations require the intake and adjustment record tables to be queryable by supplier ID.

---

## Pre-Flight Demo Checklist

Use this checklist before any external-facing session. Each item maps to a registry entry above.

---

### (a) C-Level Enterprise Demo

> These items MUST be resolved before any demo with enterprise executives, VP-level buyers, or C-Suite prospects. A single visible `Math.random()` fluctuation or fabricated KPI is sufficient to disqualify a deal.

- [ ] **MOCK-001** — Replace hardcoded `networkYield: 98.4` and `unaccountedCost: 45200.50` with real computed values or hide the panel entirely
- [ ] **MOCK-003** — Replace all hardcoded report card KPIs, especially `impactYTD: -125000`, before any executive-level screen share
- [ ] **MOCK-005** — Remove all `Math.random()` expressions from ALACARTE store performance props — values must not change on refresh
- [ ] **MOCK-002** — Replace static weekly chart data or clearly label the chart as "Sample Data"
- [ ] **MOCK-004** — Replace hardcoded company aggregate stats or hide the panel

---

### (b) Investor Data Room Review

> These items MUST be resolved before any data room access is granted to investors, analysts, or financial advisors. Assume all database records and raw API responses will be inspected.

- [ ] **MOCK-003** — `impactYTD: -125000` must not appear in any exported report or data room document
- [ ] **MOCK-001** — `networkYield: 98.4` must not appear in any financial or operational summary
- [ ] **MOCK-009** — Database records must not contain `{ msg: 'parsed' }` or `{ msg: 'normalized' }` as intelligence output fields
- [ ] **MOCK-005** — Non-deterministic `Math.random()` values must be removed before any screenshot, PDF export, or data export is generated
- [ ] **MOCK-006** — Remove guest count noise injection — real guest counts must not be perturbed before appearing in any investor-facing metric
- [ ] **MOCK-004** — Company aggregate stats must reflect real data or be clearly excluded from investor materials

---

### (c) Technical Due Diligence

> These items MUST be resolved before any technical reviewer, CTO, or engineering evaluator is given access to the codebase, database, or API layer. Assume all code will be read and all endpoints will be tested.

- [ ] **MOCK-005** — Remove `Math.random()` from all production-path computations
- [ ] **MOCK-006** — Remove `Math.random()` guest count noise from both code paths
- [ ] **MOCK-009** — Replace placeholder intake worker outputs (`'parsed'`, `'normalized'`, `'success'`) with real typed output or explicit stub structures
- [ ] **MOCK-010** — `OCREngine.extract()` must not silently return `{}` — implement real extraction or return an explicit `NOT_IMPLEMENTED` typed response
- [ ] **MOCK-008** — Remove the artificial 2-second `setTimeout` delay from the intake worker
- [ ] **MOCK-011** — Document that `weightVariancePenalty` and `overrideFrequency` are placeholders in all technical architecture documents shared with reviewers
- [ ] **MOCK-007** — Flag all ALACARTE-specific hardcoded values in any architecture or data model documentation

---

*This registry is a living document. Any new hardcoded value, placeholder, or mock introduced into the production codebase must be added here before the associated code is merged. Unregistered mocks that surface during a demo or review are an engineering accountability issue.*
