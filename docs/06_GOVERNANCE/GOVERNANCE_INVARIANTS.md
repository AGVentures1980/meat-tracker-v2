# GOVERNANCE INVARIANTS
## BRASA Meat Intelligence OS — Operational Intelligence Preservation
### Phase 1.5 — Authoritative Reference Document

**Document Version:** 1.0.0
**Classification:** Internal Governance — Engineering & Operations Leadership
**Owner:** Engineering Architecture & Restaurant Operations
**Last Reviewed:** 2026-05-26
**Status:** RATIFIED

---

## Executive Summary

This document catalogs all **operational invariants** currently encoded in the BRASA Meat Intelligence OS. An operational invariant is a constant, threshold, business rule, or enforcement mechanism whose value is not an arbitrary software default — it is a precise encoding of physical reality, regulatory discipline, multi-tenant security, or calibrated operational wisdom derived from years of Brazilian rodizio restaurant operations.

These invariants differ fundamentally from ordinary configuration parameters. They cannot be changed by toggling an environment variable, updating a feature flag, or responding to a stakeholder request. **Each invariant requires a formal cross-functional change process involving Engineering, Restaurant Operations leadership, and — where applicable — Legal/Compliance review.** Changing any of them without that process will produce incorrect data, false operational signals, security failures, or governance violations.

This document exists because institutional knowledge encoded in code is invisible to anyone who was not present when that decision was made. As the system evolves, scales to new markets, and onboards new engineers, this catalog serves as the authoritative record of *why the system behaves exactly as it does* and *what breaks if it changes.*

Engineers inheriting this codebase must treat this document as a mandatory prerequisite before modifying any of the files referenced below.

---

## ⚠️ CRITICAL WARNING

> **DO NOT CHANGE ANY VALUE DOCUMENTED IN THIS FILE WITHOUT EXPLICIT AUTHORIZATION.**
>
> The constants, thresholds, enforcement windows, and logic patterns cataloged here are not implementation details. They are the formalized expression of operational decisions made through production measurement, compliance requirements, multi-tenant security architecture, and hard-won restaurant management experience. Casual modification — even with good intentions — will produce one or more of the following outcomes:
>
> - **Silent data corruption:** Metrics will appear valid but will misrepresent actual restaurant operations, causing food cost mismanagement.
> - **Security breaches:** Multi-tenant isolation failures could expose proprietary operational data between enterprise clients.
> - **Regulatory and legal exposure:** Compliance reporting will become unreliable, and contractual SLAs may be violated.
> - **Operational lockouts:** Stores may be incorrectly blocked or incorrectly permitted access during critical service periods.
> - **Fraud system blind spots:** Anomaly thresholds tuned to real-world restaurant operations will emit false positives or fail to detect genuine fraud.
>
> **No invariant in this document may be modified without:**
> 1. A written change proposal reviewed by Engineering Architecture and Restaurant Operations leadership.
> 2. Documentation of the operational measurement or domain analysis justifying the new value.
> 3. A staged rollout with monitoring to validate the new value before full deployment.
> 4. An update to this document reflecting the change, its rationale, and its effective date.

---

## Table of Contents

1. [BACON WRAPPING RATIO (0.25)](#1-bacon-wrapping-ratio-025)
2. [GAUCHO CHICKEN BOUNDED-BY-IDEAL](#2-gaucho-chicken-bounded-by-ideal)
3. [DELIVERY FIREWALL — OLO/DINE-IN ISOLATION](#3-delivery-firewall--olodine-in-isolation)
4. [SHIFT-AWARE GUEST LOGIC (v3.2)](#4-shift-aware-guest-logic-v32)
5. [GARCIA RULE LOCKOUT — MONDAY 11AM ENFORCEMENT](#5-garcia-rule-lockout--monday-11am-enforcement)
6. [WEDNESDAY LOCK RULE — FORECAST GOVERNANCE](#6-wednesday-lock-rule--forecast-governance)
7. [COMPANY_ID SCOPE ENFORCEMENT — MULTI-TENANT ISOLATION](#7-company_id-scope-enforcement--multi-tenant-isolation)
8. [LAMB CHOPS EXCLUSION FLAG](#8-lamb-chops-exclusion-flag)
9. [PILOT SENTINEL ANOMALY THRESHOLDS](#9-pilot-sentinel-anomaly-thresholds)
10. [FRAUD RISK SCORE WEIGHTS](#10-fraud-risk-score-weights)
11. [SUPPLIER CONFIDENCE INDEX DECAY](#11-supplier-confidence-index-decay)
12. [DRIFT THRESHOLDS IN RECEIVING](#12-drift-thresholds-in-receiving)

---

## 1. BACON WRAPPING RATIO (0.25)

### File Location
`engine/MeatEngine.ts`, lines 262–263

### Code
```typescript
const swbLbs = (groupMap['steak with bacon']?.lbs || 0) + ...
const gauchoBaconActual = swbLbs * 0.25;
```

### Operational Meaning
Every 1 lb of protein wrapped with bacon (steak with bacon, chicken with bacon) consumes exactly **0.25 lbs of bacon**. This ratio is not estimated — it is derived from physical production reality:

- 1 lb of wrapped meat yields approximately **8 individual pieces**
- Each piece requires **0.5 bacon slices** (half a strip wrapped around the skewer)
- 8 pieces × 0.5 slices = **4 slices of bacon consumed**
- A standard commercial bacon package contains **16 slices per lb**
- 4 slices ÷ 16 slices/lb = **0.25 lbs of bacon per lb of wrapped protein**

### Why It Exists
Bacon is a high-cost, high-volume ingredient that does not appear as its own rodizio protein line item on guest-facing menus. Without this ratio, bacon consumption is invisible in meat reports. The ratio translates wrapped protein volume into an accurate bacon cost attribution, making total protein cost accounting complete.

### Business Consequence If Changed
- **Underestimation (ratio < 0.25):** Bacon cost is systematically undercounted. Food cost reports will show false efficiency — managers will believe they are under budget when they are not.
- **Overestimation (ratio > 0.25):** Bacon cost is overcounted. Managers will over-order bacon, increasing waste and food cost.
- Any change propagates silently across all historical and future reports. There is no alarm when the number changes.

### Telemetry Consequence If Changed
The `gauchoBaconActual` value feeds directly into the lbs/guest calculation and protein cost summaries. A changed ratio will alter every historical comparison since the system went live, making trend analysis meaningless.

### Governance Consequence If Changed
This ratio must only change if a physical re-measurement in an actual kitchen production environment determines that the wrapping technique, bacon strip weight, or portion specification has changed operationally. A re-measurement protocol must be executed across at least 3 store locations over a minimum 4-week period before a new value is adopted.

### Configurable vs Invariant
**INVARIANT.** The value 0.25 is a physical constant derived from kitchen production. It is not a tunable parameter.

---

## 2. GAUCHO CHICKEN BOUNDED-BY-IDEAL

### File Location
`engine/MeatEngine.ts`, lines 235–236

### Code
```typescript
gauchoChickenIdeal = chickenGroup.idealLbs;
gauchoChickenLbs = Math.min(chickenGroup.lbs, chickenGroup.idealLbs);
```

### Operational Meaning
The Gaucho (rodizio) portion of Chicken Breast is **capped at the ideal (target) quantity**. If the kitchen actually consumed more chicken than the rodizio ideal, the excess is classified as Kitchen/Salad chicken — not rodizio chicken. The lbs/guest metric for rodizio is calculated only on the capped `gauchoChickenLbs` value, never on the raw total.

### Why It Exists
Brazilian rodizio restaurants operate two distinct chicken consumption channels:
1. **Rodizio service:** Chicken passed tableside to guests on skewers.
2. **Kitchen/Salad bar:** Chicken used in side dishes, salads, soups, and staff meals.

Both channels consume from the same ingredient purchase. Without this cap, any kitchen overhead consumption that exceeds the ideal would be attributed to the rodizio service, inflating the lbs/guest metric and making the restaurant appear to consume more per guest than it actually does.

### Business Consequence If Changed
- **Removing the cap (using raw `lbs` instead of capped value):** Kitchen and salad bar usage is misclassified as rodizio. The lbs/guest metric rises, triggering false waste alerts and incorrect food cost reports.
- **Capping below ideal:** Chicken rodizio performance is understated.

### Telemetry Consequence If Changed
The `gauchoChickenLbs` figure is a direct input to the rodizio lbs/guest denominator. Contaminating it with kitchen overhead chicken invalidates the core operational performance indicator for every store every week.

### Governance Consequence If Changed
Any change to how the rodizio vs. kitchen split is calculated must be approved by Restaurant Operations leadership and re-validated against known-good historical weeks where the split is documented.

### Configurable vs Invariant
**INVARIANT.** The logical rule (cap at ideal) is invariant. The `idealLbs` figure itself comes from the forecast and is configurable per store per week.

---

## 3. DELIVERY FIREWALL — OLO/DINE-IN ISOLATION

### File Location
`engine/MeatEngine.ts`, lines 476–518

### Code
```typescript
const deliveryLbs = deliverySales.reduce(...);
const dineInLbs = Math.max(0, totalLbs - deliveryLbs);
```

### Operational Meaning
Protein consumed to fulfill delivery orders (OLO, UberEats, DoorDash) is **subtracted from total lbs before computing the dine-in lbs/guest metric**. Dine-in guest counts come from POS covers — delivery orders do not generate a cover count. The firewall prevents delivery volume from contaminating the restaurant's core dine-in performance indicator.

### Why It Exists
Delivery platforms operate on completely different unit economics than dine-in rodizio:
- Delivery orders are à la carte, not rodizio. Protein consumption per order is structurally different.
- Delivery covers are not tracked in the POS cover count.
- A store with high OLO volume and normal dine-in service will show artificially elevated lbs/guest if delivery protein is not isolated.

This firewall was introduced when delivery volume grew large enough to materially distort the dine-in metric. It is not a future-proofing measure — it is a production correction.

### Business Consequence If Changed
- **Removing the firewall:** A store with significant OLO volume will appear to use significantly more lbs per dine-in guest than it actually does. Managers will be incorrectly penalized. SmartPrep protein orders will be over-allocated.
- **Partial removal (e.g., only some platforms excluded):** The metric becomes inconsistent across stores with different delivery platform mixes.

### Telemetry Consequence If Changed
`dineInLbs` is the primary numerator in the lbs/guest calculation. Removing the firewall corrupts this metric at the root, making every derived report, variance analysis, and trend chart invalid.

### Governance Consequence If Changed
Any modification to which sales channels are excluded from the dine-in calculation requires formal sign-off from both Engineering Architecture and Restaurant Operations. The change must be back-tested against at least 12 weeks of historical data for at least 5 stores with material delivery volume before deployment.

### Configurable vs Invariant
**INVARIANT** (the logic pattern). The set of delivery platforms included in `deliverySales` is configurable via data, but the architectural pattern — delivery lbs are always subtracted before dine-in metric calculation — is invariant.

---

## 4. SHIFT-AWARE GUEST LOGIC (v3.2)

### File Location
`engine/MeatEngine.ts`, lines 74–93

### Code
```typescript
// Separate tracking of lunchGuests and dinnerGuests from report data
// with fallback to total estimate
```

### Operational Meaning
Lunch and dinner service are tracked as **separate guest counts** and used to calculate **separate theoretical revenue figures**. The system never blends lunch and dinner guests into a single undifferentiated pool for financial calculations.

| Service | Approximate Price Point |
|---------|------------------------|
| Lunch   | ~$29–34 per guest      |
| Dinner  | ~$54–58 per guest      |

### Why It Exists
Blending lunch and dinner guests into a single total produces a weighted-average price point that accurately represents neither service period. Since lunch and dinner are different products at different prices with different demand profiles, blended calculations systematically misrepresent:
- Theoretical revenue (used for food cost percentage calculations)
- Per-guest spend benchmarks
- SmartPrep protein allocation (lunch guests consume less protein than dinner guests in rodizio format)

v3.2 of the engine introduced this separation after production data revealed that stores with high lunch volume were showing distorted food cost percentages when blended metrics were used.

### Business Consequence If Changed
- **Collapsing to single guest count:** Theoretical revenue calculations become inaccurate. Food cost percentage is computed against a wrong revenue denominator. Stores with high lunch-to-dinner ratios are systematically misrepresented.
- **Removing the lunch/dinner price point distinction:** The financial performance dashboard loses its ability to diagnose whether a given week's performance anomaly is driven by service mix or actual food cost issues.

### Telemetry Consequence If Changed
Theoretical revenue is a foundational metric in weekly performance reports. Corrupting it invalidates food cost percentage, labor cost percentage (if revenue-denominated), and variance analysis across every store.

### Governance Consequence If Changed
Any change to the guest logic model requires a structured re-validation of historical theoretical revenue calculations and explicit sign-off that the new model produces more accurate results against ground-truth POS data.

### Configurable vs Invariant
**INVARIANT** (the architectural pattern of separate lunch/dinner tracking). The specific price point values per meal period are configurable per market and per time period.

---

## 5. GARCIA RULE LOCKOUT — MONDAY 11AM ENFORCEMENT

### File Location
`middleware/garciaRule.ts`, lines 22–50 (lockout logic), line 56 (fail-open behavior)

### Code
```typescript
if (dayOfWeek === 1 && hour >= 11) {
  // Check for WEEKLY SUBMITTED InventoryCycle since Sunday 22:00
}

// Line 56 — fail-open:
// If database throws an error during the check, call next() and allow access
```

### Operational Meaning
If a store has not submitted their weekly inventory count by **Monday at 11:00 AM local time**, the system blocks access to the operational dashboard for that store until submission is complete. The system checks for a `WEEKLY SUBMITTED` InventoryCycle record with a timestamp after the preceding Sunday at 22:00.

**Fail-open behavior (line 56):** If the database throws any error during the compliance check, the middleware calls `next()` and **allows access to proceed**. This is intentional and must never be changed to fail-closed.

### Why It Exists
Weekly inventory count is the foundational data input for all MeatEngine calculations. Without it:
- There is no baseline protein quantity to compare against
- Variance calculations are undefined
- Fraud detection has no reference point
- SmartPrep ordering recommendations are unsupported

The lockout enforces a non-negotiable operational cadence. Without enforcement, stores delay submission, the data quality degrades, and the entire intelligence layer becomes unreliable.

The **Monday 11AM deadline** was chosen specifically because:
- Sunday close inventory is the most critical count of the week (end of week, beginning of new ordering cycle)
- Monday morning is when District Managers review weekly reports
- 11AM allows store managers who open Monday to submit before the management review window

### Business Consequence If Changed
- **Extending the deadline (e.g., to noon or Tuesday):** Stores delay submission. Data quality degrades. District Manager review cycles are disrupted.
- **Shortening the deadline (e.g., to Sunday night):** Operational disruption during the busiest service period of the week. Managers cannot comply while running a full-house Sunday dinner service.
- **Removing the lockout entirely:** Inventory compliance collapses. The operational intelligence layer loses its data foundation.

### Telemetry Consequence If Changed
All downstream metrics — lbs/guest, food cost, variance, fraud score — are unreliable if inventory data is not submitted on the mandated cadence. Changing the enforcement window degrades the reliability of every derived metric.

### Governance Consequence If Changed
The Garcia Rule lockout is a governance mechanism, not a software feature. Changes to the enforcement window must be approved at the Restaurant Operations leadership level with documented operational rationale.

### Fail-Open vs Fail-Closed — CRITICAL
**The fail-open behavior on line 56 must never be changed to fail-closed.** A transient database error during peak Monday morning service would simultaneously lock out all stores from the operational dashboard if this became fail-closed. A restaurant mid-service with no access to their operational system is an emergency. The fail-open design accepts the risk that a DB failure briefly bypasses the compliance check in exchange for guaranteed operational continuity.

### Configurable vs Invariant
- The enforcement day/time window (Monday, 11AM): **INVARIANT without Operations leadership approval.**
- The fail-open behavior on DB error: **INVARIANT — must never become fail-closed.**
- The cycle type checked (`WEEKLY SUBMITTED`): **INVARIANT.**

---

## 6. WEDNESDAY LOCK RULE — FORECAST GOVERNANCE

### File Location
`controllers/ForecastController.ts`, lines 65–92

### Code
```typescript
deadline.setDate(deadline.getDate() - 5);
// Calculates Wednesday of the previous week as the forecast editing deadline
```

### Operational Meaning
Store managers must submit their guest count forecast (broken into lunch and dinner splits) **before Wednesday of the week prior to the target service week**. After this deadline:
- Store managers lose write access to the forecast
- Only Directors and Admins can modify the forecast

This rule was originally defined in Portuguese operations documentation as: *"até quarta-feira da semana anterior"* (until the Wednesday of the previous week).

### Why It Exists
SmartPrep protein allocation is computed from the guest count forecast. The system needs the forecast to be stable before it generates protein ordering recommendations, which are typically reviewed Thursday–Friday for the following week's deliveries. If managers could edit forecasts indefinitely, SmartPrep recommendations would be recalculated with moving targets, making ordering coordination with suppliers impossible.

The Wednesday deadline creates a stable planning window where:
1. Managers submit their demand signal (guest forecast)
2. The system computes protein recommendations
3. Operations reviews recommendations Thursday–Friday
4. Suppliers receive orders before their weekend cutoff

### Business Consequence If Changed
- **Later deadline (e.g., Friday):** The planning window between forecast lock and supplier order cutoff collapses. SmartPrep recommendations cannot be validated before ordering.
- **Earlier deadline (e.g., Monday):** Managers have less information available when forecasting. Forecast accuracy degrades. SmartPrep recommendations are based on older, less accurate demand signals.
- **Removing the deadline entirely:** Any manager can edit forecasts at any time, including during the service week. SmartPrep ordering becomes chaotic.

### Telemetry Consequence If Changed
Forecast accuracy is a direct input to SmartPrep recommendation quality. Changing the governance window changes the information quality available at forecast submission time, which cascades into protein waste and shortage metrics.

### Governance Consequence If Changed
The Wednesday deadline encodes a cross-functional operational agreement between Restaurant Operations, Supply Chain, and the product system. Changes require re-negotiation of that agreement at the Director level.

### Configurable vs Invariant
**INVARIANT** (the logic pattern of a locked window before the service week). The specific day (Wednesday) is an operationally-derived constant that would require Director-level approval to change.

---

## 7. COMPANY_ID SCOPE ENFORCEMENT — MULTI-TENANT ISOLATION

### File Location
`engine/MeatEngine.ts` lines 38–41, 130–135, 430–431, 674–676, and throughout all controllers

### Code
```typescript
if (companyId) {
  whereStore.company_id = companyId;
}
// Applied on every Prisma query that touches store or company data
```

### Operational Meaning
Every database query that accesses store or company data **must be scoped to the active company (tenant)**. No query is permitted to return data belonging to a different `company_id` than the authenticated session's tenant. This enforcement is applied at every data access point in the system, not just at the API boundary.

### Why It Exists
BRASA Meat Intelligence OS is a **multi-tenant SaaS platform**. Current enterprise clients include independent multi-unit operators, and the system architecture is designed to support multiple distinct brands (e.g., a hypothetical scenario where Outback Steakhouse and Hard Rock Cafe both use the platform). Each tenant's operational data — protein costs, guest counts, supplier relationships, fraud signals — is **proprietary and commercially sensitive**.

The `company_id` scope enforcement is the technical implementation of the contractual data isolation guarantee made to every enterprise client. It is not a best practice; it is a legal obligation.

### Business Consequence If Changed
- **Removing a single `company_id` filter on one query:** That query returns cross-tenant data. Depending on which query, this could expose another tenant's weekly protein costs, forecast data, supplier contracts, or fraud intelligence.
- **Adding a code path that bypasses the filter:** An attacker or misconfigured session could access any tenant's data.

### Telemetry Consequence If Changed
Cross-tenant data contamination in analytics pipelines produces nonsensical aggregates and may cause one tenant's metrics to silently include another's data — which would be undetectable without per-row audit logging.

### Governance Consequence If Changed
This is a **legal and compliance invariant**, not merely an operational one. Any weakening of multi-tenant isolation would constitute a breach of the data processing agreements with enterprise clients and potentially violate applicable data protection regulations. Engineering changes in this area require Security review and Legal sign-off.

### Configurable vs Invariant
**INVARIANT — SECURITY CRITICAL.** The pattern of scoping every query to `company_id` is non-negotiable. No exception, shortcut, or "superadmin bypass" may be introduced without a full security review.

---

## 8. LAMB CHOPS EXCLUSION FLAG

### File Location
`engine/MeatEngine.ts`, lines 95–103

### Code
```typescript
const SERVES_LAMB_CHOPS = (storeData as any)?.serves_lamb_chops_rodizio || false;
if (!SERVES_LAMB_CHOPS) {
  // subtract lamb lbs from indicator
}
```

### Operational Meaning
Lamb Chops are an **optional, premium protein** not included in the standard rodizio offering at all store locations. They are typically served at specific locations or during special events. If a store does not include Lamb Chops in its regular rodizio service, the lamb lbs consumed during that period must be **excluded from the lbs/guest indicator** for that store.

The `serves_lamb_chops_rodizio` flag per store record controls this exclusion. When `false`, lamb lbs are subtracted from the rodizio indicator denominator.

### Why It Exists
Lamb Chops are significantly more expensive per lb than standard rodizio proteins (beef, chicken, pork). A store that hosts a one-time special lamb event — or that begins a lamb chops trial — would show a dramatic spike in lbs/guest if lamb is counted in the standard rodizio metric, even though the spike reflects an extraordinary event, not a change in ongoing food cost efficiency.

Without this flag, operational anomaly alerts would trigger incorrectly, District Manager reports would show false variance, and the store's historical performance trend would be distorted.

### Business Consequence If Changed
- **Removing the exclusion (always including lamb):** Stores without regular lamb service but with occasional lamb events show spiked lbs/guest metrics, triggering false waste alerts and distorting performance reviews.
- **Always excluding lamb regardless of flag:** Stores that *do* serve lamb regularly will have their protein consumption undercounted, masking genuine food cost issues.

### Telemetry Consequence If Changed
False spikes in lbs/guest are indistinguishable from genuine protein waste events unless the exclusion flag is applied correctly. Fraud detection and anomaly scoring both respond to lbs/guest deviations — removing the exclusion would generate false fraud signals for legitimate special events.

### Governance Consequence If Changed
The `serves_lamb_chops_rodizio` flag is a store-level configuration that must be updated by Operations when a store's menu changes. The **logic of the exclusion** is invariant; the **value of the flag per store** is configurable through the appropriate administrative interface.

### Configurable vs Invariant
- The exclusion logic (excluding lamb when flag is false): **INVARIANT.**
- The `serves_lamb_chops_rodizio` flag value per store: **CONFIGURABLE** by Operations administrators.

---

## 9. PILOT SENTINEL ANOMALY THRESHOLDS

### File Location
`agents/PilotSentinelAgent.ts`, lines 30, 49, 64, 85, 119

### Thresholds

| Threshold Name         | Value(s)                             | Alert Type              |
|------------------------|--------------------------------------|-------------------------|
| FAT-FINGER             | lbs/guest < 0.8 or > 3.0            | Anomaly alert           |
| SINGLE ORDER           | > 2,500 lbs or < 30 lbs with items  | Anomaly alert           |
| BEEF RIBS UNIT CONFUSION | < 20 lbs                          | Unit confusion alert    |
| SYSTEMIC VARIANCE      | avg variance < -50 lbs, ≥ 3 cycles  | Market trend alert      |

### Operational Meaning
These thresholds represent **calibrated operational knowledge** about what is physically possible and operationally normal in a Brazilian rodizio restaurant:

- **FAT-FINGER (0.8–3.0 lbs/guest):** A rodizio restaurant physically cannot serve less than ~0.8 lbs of meat per guest (below this, guests would not be satisfied; service would be flagged operationally). Values above 3.0 lbs/guest exceed what is physically possible to serve at table in a rodizio format and indicate data entry error or system miscalculation.
- **SINGLE ORDER thresholds:** A single inventory cycle order below 30 lbs with line items is almost certainly a partial or test entry. Above 2,500 lbs is beyond the storage and usage capacity of a single restaurant location for a standard cycle.
- **BEEF RIBS UNIT CONFUSION (< 20 lbs):** A single Beef Rib weighs approximately 5 lbs. An entry of, for example, "4 lbs" of beef ribs almost certainly means 4 ribs (= 20 lbs), not 4 lbs net weight. This threshold catches the common manager error of entering unit count instead of weight.
- **SYSTEMIC VARIANCE (< -50 lbs avg, ≥ 3 cycles):** A persistent negative variance of this magnitude across multiple consecutive cycles is not random error — it signals a structural supply chain issue, systematic shrinkage, or market-level trend that requires escalation.

### Why It Exists
The Pilot Sentinel Agent is an automated anomaly detection layer. Without calibrated thresholds, it either generates too many false positives (alert fatigue, real anomalies missed) or too many false negatives (real problems go undetected). These specific values were derived from operational data and validated against known-good and known-bad historical records.

### Business Consequence If Changed
- **Widening thresholds (less sensitive):** Real anomalies — fat-finger errors, unit confusion, systemic shrinkage — go undetected. Food cost losses accumulate silently.
- **Narrowing thresholds (more sensitive):** Alert fatigue. Managers and District Managers begin ignoring Sentinel alerts. When a real anomaly occurs, it is buried in noise.

### Telemetry Consequence If Changed
The Sentinel's alert rate is itself a monitored metric. Changes to thresholds will shift alert volume, potentially masking the signal that the alert system is working correctly.

### Governance Consequence If Changed
Any change to Sentinel thresholds requires documented operational justification — specifically, evidence from production data that the current threshold produces demonstrably incorrect classifications. Changes must be reviewed by the team that originally calibrated the thresholds against operational history.

### Configurable vs Invariant
**INVARIANT** without operational data analysis and documented justification. These are not arbitrary software limits; they are the system's encoded understanding of physical reality in a Brazilian rodizio kitchen.

---

## 10. FRAUD RISK SCORE WEIGHTS

### File Location
`services/FraudIntelligenceEngine.ts`, lines 91–140

### Weights and Levels

| Signal                    | Score Weight | Rationale                                              |
|---------------------------|-------------|--------------------------------------------------------|
| WEAK_RULE_USAGE           | +15         | Minor process deviation                                |
| DETERMINISTIC_CONFLICT    | +30         | OCR vs GS1 barcode mismatch — objective discrepancy   |
| WEIGHT_DEVIATION_4LB      | +40         | Physical weight outside spec — high confidence signal |
| EXECUTIVE_FORCE_OVERRIDE  | +60         | Bypasses all safety systems — maximum severity        |

| Risk Level | Threshold   |
|------------|------------|
| CRITICAL   | score ≥ 85 |
| HIGH       | score ≥ 60 |
| MEDIUM     | score ≥ 40 |

### Operational Meaning
Each weight encodes the **relative severity of a compliance failure mode** in the context of protein receiving and supply chain integrity:

- **WEAK_RULE_USAGE (+15):** A minor procedural gap. Warrants monitoring but not escalation on its own.
- **DETERMINISTIC_CONFLICT (+30):** The OCR-scanned label and GS1 barcode data disagree on a product identifier or weight. This is an objective, machine-verifiable discrepancy — it cannot be explained by human estimation error. It indicates either a mislabeled product, a substituted product, or data manipulation.
- **WEIGHT_DEVIATION_4LB (+40):** The received weight is more than 4 lbs outside the corporate protein spec. Catch-weight variation is normal in fresh protein; 4 lbs was calibrated as the boundary between normal variation and suspicious deviation.
- **EXECUTIVE_FORCE_OVERRIDE (+60):** An executive has manually overridden the system's safety checks. This is intentionally the heaviest individual weight because a force override bypasses the automated compliance layer entirely. The system cannot prevent an override — it can only record and penalize it in the risk score.

The **CRITICAL threshold (≥ 85)** was set to require at least two high-severity signals before triggering a critical alert. This prevents single-signal false positives from generating maximum-severity escalations.

### Why It Exists
The fraud scoring system must discriminate between minor process deviations and genuine compliance failures. Flat scoring (all signals equal weight) produces too many false critical alerts. Weight-based scoring mirrors the domain expertise of compliance and operations leadership about which signals are most meaningful.

### Business Consequence If Changed
- **Lowering EXECUTIVE_FORCE_OVERRIDE weight:** Reduces the penalty for bypassing safety systems. Creates an incentive to override rather than comply.
- **Lowering DETERMINISTIC_CONFLICT weight:** Objective product mislabeling is treated as minor. Systematic supplier substitution goes undetected.
- **Raising thresholds (e.g., CRITICAL ≥ 100):** Fewer events trigger critical alerts. Genuine fraud patterns may reach CRITICAL before escalation.
- **Lowering thresholds:** Alert fatigue. Critical designation loses meaning.

### Telemetry Consequence If Changed
Risk score distributions are monitored over time. Changing weights will shift score distributions, invalidating historical comparisons and requiring recalibration of alert response playbooks.

### Governance Consequence If Changed
Changes to fraud scoring weights must be reviewed by both Engineering Architecture and Compliance/Operations leadership. Changes must be documented with the domain rationale for the new value and back-tested against historical fraud events to confirm the new weights would have produced correct classifications.

### Configurable vs Invariant
**INVARIANT** without domain expertise review. These weights encode compliance domain knowledge, not software preferences.

---

## 11. SUPPLIER CONFIDENCE INDEX DECAY

### File Location
`services/FraudIntelligenceEngine.ts`, line 172

### Code
```typescript
const confidenceIndex = Math.max(0, 1.0 - (anomalyRate * 2.0));
```

### Operational Meaning
The Supplier Confidence Index is calculated as: `max(0, 1.0 - (anomalyRate × 2.0))`. This means:
- A supplier with **0% anomaly rate** has a confidence index of **1.0** (full trust)
- A supplier with **25% anomaly rate** has a confidence index of **0.5** (moderate concern)
- A supplier with **50% anomaly rate** (or higher) has a confidence index of **0.0** (zero trust)

The **multiplier of 2.0** means trust decays **twice as fast as the anomaly rate rises**. A supplier does not need a majority of anomalous deliveries to reach zero confidence — 50% is sufficient.

### Why It Exists
Supply chain integrity failures are not symmetric with successes. A supplier that delivers correctly 80% of the time but has a 20% anomaly rate represents an **unacceptable compliance risk** — the 20% anomalous deliveries could represent systematic product substitution, weight fraud, or labeling manipulation. In protein receiving for food service, even occasional supply chain failures have direct food safety, cost, and compliance consequences.

The aggressive 2.0 multiplier reflects the policy decision that **supply chain partners must operate at very low anomaly rates to maintain trust**. This is not a software convenience — it encodes an explicit risk tolerance decision made by Operations and Compliance leadership.

### Business Consequence If Changed
- **Multiplier < 2.0 (e.g., 1.0):** Trust decays more slowly. Suppliers with significant anomaly rates maintain higher confidence scores. Systematic fraud is slower to be detected and flagged.
- **Multiplier > 2.0:** Trust collapses faster. Even suppliers with low anomaly rates may lose confidence index quickly due to small fluctuations. Supplier relationships are disrupted.
- **Removing the floor at 0:** Negative confidence indices are mathematically nonsensical and would break downstream comparisons.

### Telemetry Consequence If Changed
The Supplier Confidence Index is used in composite fraud risk scoring. Changing the decay rate shifts confidence distributions across all suppliers, invalidating historical supplier risk rankings.

### Governance Consequence If Changed
The 2.0 multiplier represents a calibrated risk tolerance policy. Changes require documented domain analysis and approval from Compliance and Supply Chain leadership.

### Configurable vs Invariant
**INVARIANT** without Compliance and Supply Chain leadership review. The decay formula encodes an explicit risk policy, not a technical default.

---

## 12. DRIFT THRESHOLDS IN RECEIVING

### File Location
`services/FraudIntelligenceEngine.ts` (referenced in the WEIGHT_DEVIATION_4LB fraud signal)

### Operational Meaning
The system accepts or flags deliveries based on weight variance against the **CorporateProteinSpec** — the official expected weight specification for each protein product stored in the database. The **±4 lb threshold** is used for the `WEIGHT_DEVIATION_4LB` fraud signal: a received weight that deviates more than 4 lbs from the corporate spec triggers a +40 fraud score contribution.

This threshold acknowledges that fresh protein products (whole muscle cuts, bone-in products, catch-weight items) have inherent natural weight variation. A 4 lb deviation boundary was established as the point beyond which the variation is no longer explainable by natural catch-weight tolerance and becomes suspicious.

### Why It Exists
Fresh protein is sold by weight, not by count. A whole beef tenderloin will never weigh exactly the spec weight — natural variation of ±1–2 lbs is expected. However, a deviation of 4+ lbs on a standard cut almost certainly indicates:
- A different product was delivered than what was ordered (product substitution)
- The receiving weight record was entered incorrectly (human error or intentional falsification)
- The supplier's weight documentation is fraudulent

The ±4 lb boundary was derived from operational experience with the actual weight variation ranges of the protein cuts served at BRASA-format restaurants.

### Business Consequence If Changed
- **Threshold > 4 lbs:** More weight variance is accepted as normal. Systematic short-weighting or product substitution may not trigger fraud flags until the deviation becomes extreme.
- **Threshold < 4 lbs:** Normal catch-weight variation generates fraud signals. Alert fatigue and supplier relationship friction increase. Legitimate deliveries are flagged as suspicious.

### Telemetry Consequence If Changed
The ±4 lb boundary is embedded in the fraud score weight `WEIGHT_DEVIATION_4LB`. Changing the threshold changes which deliveries contribute +40 to the fraud score, shifting the distribution of risk scores across all historical and future receiving events.

### Governance Consequence If Changed
The threshold must only change if operational measurement demonstrates that the natural catch-weight variation range for the protein portfolio has changed (e.g., due to a new protein product category or a change in how proteins are portioned before delivery). Any change requires documented measurement data and Compliance review.

### Configurable vs Invariant
**INVARIANT** without operational measurement evidence. The 4 lb value is derived from physical protein receiving reality, not from a software configuration preference.

---

## Change Request Protocol

Any proposed change to an invariant documented in this file must follow this protocol:

1. **Change Proposal:** Submit a written change proposal identifying:
   - Which invariant is being changed
   - The current value and the proposed new value
   - The operational, compliance, or technical rationale for the change
   - The predicted impact on historical and future metrics

2. **Domain Validation:** The proposal must be reviewed by the domain owner:
   - Kitchen production constants (Invariants 1, 2): Restaurant Operations
   - Revenue and guest logic (Invariants 3, 4): Restaurant Operations + Finance
   - Governance enforcement (Invariants 5, 6): Operations Leadership
   - Multi-tenant security (Invariant 7): Engineering Security + Legal
   - Anomaly and fraud thresholds (Invariants 8–12): Compliance + Supply Chain + Engineering

3. **Back-Testing:** The proposed change must be applied to a minimum of 12 weeks of historical production data and validated that the new value produces correct outcomes against ground-truth records.

4. **Staged Rollout:** The change must be deployed to a subset of stores first and monitored for a minimum of 4 weeks before full deployment.

5. **Document Update:** This file must be updated to reflect the new value, the rationale for the change, the effective date, and the names of approvers.

6. **Post-Deployment Monitoring:** Alert thresholds and metric distributions must be monitored for 30 days post-deployment to confirm the change did not introduce unintended consequences.

---

## Glossary

| Term | Definition |
|------|-----------|
| **Invariant** | A constant, rule, or logic pattern whose value encodes operational reality and must not change without formal cross-functional review |
| **lbs/guest** | The primary rodizio operational efficiency metric: total rodizio protein lbs divided by dine-in guest count |
| **Rodizio** | The Brazilian-style all-you-can-eat tableside service model |
| **Gaucho** | The rodizio service channel (as opposed to kitchen/salad bar) |
| **OLO** | Online Ordering — delivery orders placed through third-party platforms (UberEats, DoorDash, proprietary OLO platform) |
| **SmartPrep** | The protein ordering recommendation system that uses guest forecasts to suggest weekly protein purchase quantities |
| **InventoryCycle** | A weekly protein inventory count submission by store managers |
| **CorporateProteinSpec** | The official database record of expected weight specifications for each protein product |
| **GS1** | The global barcode standard used for product identification in commercial food supply chains |
| **Confidence Index** | The supplier trust score (0.0–1.0) derived from historical anomaly rate |
| **Fail-open** | A security/access pattern where a system failure results in access being granted (prioritizes availability over restriction) |
| **Fail-closed** | A security/access pattern where a system failure results in access being denied (prioritizes restriction over availability) |
| **Company_ID** | The unique identifier for a tenant in the multi-tenant architecture |

---

*This document is maintained by Engineering Architecture. Questions should be directed to the Engineering and Restaurant Operations leadership team. All change requests must follow the protocol defined in this document.*

*BRASA Meat Intelligence OS — Phase 1.5: Operational Intelligence Preservation*
