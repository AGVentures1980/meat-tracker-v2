# BRASA Telemetry Architecture: Executive Visualizer

This document visualizes the BRASA operational telemetry flow and illustrates where traditional systems (ERPs, inventory databases, and generic spreadsheets) lose visibility, creating margin exposure.

---

## 1. Physical Telemetry Flow vs. Legacy Software Visibility

The diagram below highlights the difference between BRASA's continuous physical telemetry and the periodic, retrospective checks of legacy systems.

```
                  DISTRIBUTOR
                       │
                       ▼
                 [RECEIVING DOCK] ───────── Billed Invoice Weights
                       │                   (Legacy Systems assume this is correct)
                       ▼
                 [SCALE VALIDATION] ◄────── BRASA verifies physical vs. billed weight
                       │                   (Blocks short-shipments on ingestion)
                       ▼
               [PROCESSING YIELD] ◄─────── BRASA verifies raw-to-trim portion yield
                       │                   (Detects supplier cuts & prep inefficiencies)
                       ▼
                 [CONSUMPTION]
                       │
                       ▼
                  [VARIANCE] ◄──────────── BRASA reconciles portion yield vs. POS sales
                       │                   (Identifies plate waste & over-portioning)
                       ▼
              EXECUTIVE VISIBILITY
```

---

## 2. Legacy Visibility Blindspots

Traditional inventory and ERP platforms lose control at critical physical transition points in the restaurant kitchen:

### G1: Inbound Receiving Dock
*   **The Legacy Action:** Clerks sign the supplier delivery sheet or manually input the invoice weight into the back-office computer.
*   **The Legacy Blindspot:** The system assumes the supplier's printed invoice weight is correct. Short-weight boxes (e.g., a box invoiced at 40 lbs that physically weighs 37.5 lbs) are accepted and paid for.
*   **BRASA Invariant:** The barcode scan is locked to a physical scale weight. Discrepancies outside the tolerance band trigger a warning gate on the dock terminal at the moment of ingestion.

### G2: Prep Block & Butcher Station
*   **The Legacy Action:** Butchers trim primals into steaks or portions. The weight of the trim and fat is discarded. No measurements are logged until the end-of-week physical inventory count.
*   **The Legacy Blindspot:** The system cannot detect if the supplier shipped excess fat or if the kitchen staff is over-trimming, leading to structural yield degradation.
*   **BRASA Invariant:** Prep scales capture before-and-after weights for every batch, logging the precise yield percentage and flagging trim variations.

### G3: Point of Sale (POS) Reconciliations
*   **The Legacy Action:** Sales counts are compared against end-of-period inventory levels to calculate the theoretical-vs-actual food cost.
*   **The Legacy Blindspot:** The cost percentage is calculated, but there is no way to determine if the cost variance was caused by short-weight receiving, poor prep yields, over-portioning at the line, or waste.
*   **BRASA Invariant:** By tracking weight from received boxes to trimmed portions, BRASA isolates receiving errors, processing yield losses, and sales variances.

---

## 3. High-Trust Architecture Summary

BRASA converts physical operations into auditable, scale-locked telemetry points:

| Physical Location | Device / Sensor | Ingested Telemetry | Governance Control |
| :--- | :--- | :--- | :--- |
| **Receiving Dock** | Cellular Dock Terminal + Floor Scale | GS1 Barcode ID + Verified Net Weight | Warning Gate Block + Invoice OCR Check |
| **Butcher Prep Block** | Calibrated Prep Scale | Batch Raw Weight + Trim Weight + Portion Weight | Yield Variance Log + Target Limits Check |
| **Back Office** | Web Console (Cellular Node) | Aggregate Store Ingest vs. Total Trim Yield | Certified Override Tracking + Alert Logs |
