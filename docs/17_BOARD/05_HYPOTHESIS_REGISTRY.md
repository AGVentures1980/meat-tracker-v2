# AGV Ventures — Hypothesis Registry

**Classification:** CONFIDENTIAL · Research & Development  
**Directory Scope:** AGV Ventures Portfolio  
**Status:** ACTIVE REGISTER  

---

## 1. Hypothesis Records

### Hypothesis HYP-001: Silent Baseline Accuracy
*   **ID:** `HYP-001`
*   **Descrição:** Running a "Silent Baseline" (passive background telemetry collection, zero alerts) during the first 7 days of a pilot captures the natural operational variance and supplier discrepancy rates, preventing staff from temporarily altering their behavior because they feel observed (Hawthorne Effect).
*   **Evidências atuais:** 
    - The Tampa Audit showed a $3.8\%$ catch-weight shortage during Week 1 (Silent), which dropped to $<0.5\%$ in Week 2 when warning gates were activated and staff knew weights were audited.
*   **Evidências contrárias:** None observed.
*   **Status:** VALIDATED

---

### Hypothesis HYP-002: Inbound Catch-Weight Discrepancies
*   **ID:** `HYP-002`
*   **Descrição:** At least $3\%$ of high-value protein boxes delivered by food distributors (e.g. Sysco, US Foods) weigh less than the printed invoice weight, representing direct EBITDA leakage.
*   **Evidências atuais:**
    - Audit results across 3 pilot locations showed systematic short-weights of 1.5 to 4.2 lbs on beef ribs, tenderloin, and bacon boxes, totaling $4.2\%$ invoice variance.
*   **Evidências contrárias:**
    - Some local artisan suppliers with dedicated direct store delivery (DSD) show $<0.5\%$ weight variance.
*   **Status:** VALIDATED

---

### Hypothesis HYP-003: Scale-Lock Data Integrity
*   **ID:** `HYP-003`
*   **Descrição:** Locking database inputs directly to calibrated hardware scale weights (IoT scale-lock) eliminates clerk typing errors and fraud bypasses by $>90\%$ compared to manual invoice entry.
*   **Evidências atuais:**
    - Audit logs show manual override rates drop from $15\%$ to $<2\%$ when scales are locked and credential validations are active.
*   **Evidências contrárias:**
    - Hardware connectivity failures or scale battery drops can temporarily block receiving operations, requiring emergency manual override codes.
*   **Status:** MONITORING

---

### Hypothesis HYP-004: Cross-Category Telemetry Scaling
*   **ID:** `HYP-004`
*   **Descrição:** The BRASA operational telemetry framework (GS1 scanning, scale locking, yield engine, and compliance lockout) can govern seafood, produce, beverage, and labor with $<15\%$ database schema changes.
*   **Evidências atuais:**
    - Architectural analysis shows the `ComplianceEngine` logic (Phase 1 to Phase 4 validations) fits case-count and quality check patterns for produce and case-receipts for beverages.
*   **Evidências contrárias:**
    - Labor tracking is time-dependent and geofenced, which requires a completely different data ingestion model (GPS/biometrics) compared to physical weights.
*   **Status:** HYPOTHESIS

---

### Hypothesis HYP-005: Executive Score Actionability
*   **ID:** `HYP-005`
*   **Descrição:** Summarizing store performance into a single "Executive Network Score" (A to F grade) triggers faster operational intervention by regional directors than detailed spreadsheets.
*   **Evidências atuais:**
    - Focus group reviews with multi-unit COOs indicated they spend $<2$ minutes reviewing standard dashboards, but will immediately contact stores that display an "F" compliance grade.
*   **Evidências contrárias:**
    - Some detail-oriented CFOs prefer raw variance logs to calculate dollar credits directly.
*   **Status:** HYPOTHESIS
