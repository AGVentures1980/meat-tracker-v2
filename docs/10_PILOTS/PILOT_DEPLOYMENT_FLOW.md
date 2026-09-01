# BRASA Pilot Deployment Flow

This document details the operational rollout, scheduling, and deployment methodology for BRASA's 30-day pilot validation program (the **Operational Stop-Loss Assessment**). The entire framework is structured to minimize kitchen disruption, avoid corporate IT bottlenecks, and establish a clear, auditable timeline for margin validation.

---

## 1. Rollout Schedule Overview

The pilot is conducted over 30 days and divided into three distinct phases:

```
[Day 1-7]           [Day 8-28]                          [Day 29-30]
Phase 1             Phase 2                             Phase 3
Silent Baseline     Active Telemetry & Governance      Executive Assessment
(Zero Alerts)       (Warning Gates Activated)           (EBITDA Reconciliation)
```

---

## 2. Phase 1: Silent Baseline (Days 1–7)

*   **Objective:** Capture the unit's natural operational variance, invoice errors, and trim yields under normal operating conditions.
*   **Operational Flow:**
    *   BRASA cellular terminals and scale sensors are installed at the receiving dock and prep station.
    *   The system collects telemetry in the background. No warning gates are activated, and no alerts are shown to dock clerks or butchers.
    *   Clerks and kitchen staff follow their existing routines without change.
*   **Significance:** This phase establishes a true, uninfluenced baseline of weight discrepancy rates and prep variances, preventing staff from temporarily modifying behavior because they are being monitored.

---

## 3. Phase 2: Active Telemetry & Governance (Days 8–28)

*   **Objective:** Activate active telemetry constraints to measure compliance rates and quantify margin recovery.
*   **Operational Flow:**

```
+------------------+     +--------------------+     +-------------------+
| Inbound Insu-    |     | Scale-Locked       |     | Warning Gate      |
| mo Scan          | --> | Weight Verify      | --> | Triggered         |
| (GS1/EAN Barcode)|     | (NIST Calibrated)  |     | (If Out-of-Spec)  |
+------------------+     +--------------------+     +-------------------+
                                                              |
                                                              v
+------------------+     +--------------------+     +-------------------+
| Supervisor       |     | Real-time          |     | Certified         |
| Override Log     | <-- | Telemetry Capture  | <-- | Visual OCR        |
| (Text Justified) |     | (Immutable Log)    |     | Confirmation      |
+------------------+     +--------------------+     +-------------------+
```

### 3.1 Dock Receiving Telemetry
*   **Scan:** Dock clerk scans the box barcode using the BRASA terminal.
*   **Validation:** The box is placed on the calibrated receiving scale. The terminal checks the weight against the supplier specification.
*   **Warning Gate:** If the weight is within the tolerance band, the scan completes. If it is underweight, a warning gate is triggered.
*   **Resolution:** The clerk must capture a visual OCR confirmation of the supplier invoice weight, or seek a supervisor override (which is logged with credentials and text justification).

### 3.2 Prep & Processing Yield Telemetry
*   **Ingestion:** The butcher places bulk protein pieces on the prep scale.
*   **Processing:** Prep work (trimming, cleaning, porcionamento) is completed.
*   **Yield Log:** The finished portions and trim weights are placed on the scale. The system calculates the yield percentage against the baseline standard, logging any sub-spec cuts or trim inefficiencies.

---

## 4. Phase 3: Executive Assessment (Days 29–30)

*   **Objective:** Reconcile all collected telemetry against POS data and distributor invoices to compile the final assessment.
*   **Reconciliation Steps:**
    *   **Inbound Weight Reconciliation:** Compare total invoice weights from distributors against scale-locked receiving weights.
    *   **Yield Loss Reconciliation:** Compare total bulk protein input against finished portions yield to calculate trim loss.
    *   **Sales Depletion Reconciliation:** Cross-reference final portions yield against POS product sales to identify sales-to-consumption variance (over-portioning, unlogged kitchen waste).
*   **Deliverable:** Generation of the **Executive Variance & Recovery Assessment**, detailing verified distributor weight credits and operational margin recovery pathways.

---

## 5. Minimizing Operational Disruption

The pilot is structured under strict constraints to prevent kitchen friction:

1.  **IT Zero-Footprint:** We do not touch local store servers, POS networks, or back-office computers. All BRASA devices use standalone cellular connectivity.
2.  **Labor Integration:** The receiving workflow adds less than 15 seconds per scanned box.
3.  **No Interruption of Deliveries:** If a warning gate is triggered during peak hours, clerks can resolve it in less than 30 seconds or override the warning, ensuring deliveries are never delayed.
4.  **Hardware Maintenance:** Remote telemetry diagnostics monitor scale calibration and battery levels, requiring zero support from local store managers.
