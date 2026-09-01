# BRASA Pilot Economics Framework

This document establishes the financial modeling, operational assumptions, and margin-exposure calculations used to structure BRASA's 30-day pilot validation program. 

BRASA operates under a strict, risk-neutral financial framework. We do not present speculative, idealized return-on-investment (ROI) numbers. Instead, the pilot is designed to **identify and quantify actual margin exposure** in the physical operation, enabling operations leaders to make data-driven investment decisions.

---

## 1. Defining Margin Exposure (The Leakage Model)

Margin exposure represents the difference between what the enterprise pays for protein assets and the value realized at the point of consumption. It is calculated using two primary physical measurements:

$$\text{Total Margin Exposure} = \text{Receiving Variance} + \text{Processing Variance} + \text{Depletion Variance}$$

### 1.1 Inbound Receiving Variance ($V_r$)
The difference between invoiced weight billed by the distributor ($W_i$) and scale-locked receiving weight verified on the dock ($W_r$), multiplied by the average cost per pound of the protein ($C_p$):

$$V_r = (W_i - W_r) \times C_p$$

*This exposure is caused by supplier short-weight delivery errors, packing variances, and ice-weight calculations.*

### 1.2 Processing Yield Variance ($V_y$)
The difference between the standard expected trim yield ($Y_s$) and the actual verified yield ($Y_a$) achieved at the prep block, multiplied by the cost of the raw protein weight input ($W_p$):

$$V_y = (Y_s - Y_a) \times W_p \times C_p$$

*This exposure is caused by sub-spec supplier cuts (excessive fat/gristle), poor butcher block cutting discipline, and unlogged trim waste.*

### 1.3 Depletion Variance ($V_d$)
The difference between portion weight expected based on POS sales data ($W_s$) and the portion weight actually processed and sent to the floor ($W_p$):

$$V_d = (W_p - W_s) \times C_p$$

*This exposure is caused by over-portioning at the plate line and unlogged kitchen waste.*

---

## 2. Operational Assumptions

To ensure the validity of the pilot data, the operations team and the pilot partner must align on the following core operational parameters:

### 2.1 Deployment Assumptions
*   **Scale Calibration:** All receiving and prep scales must be calibrated using NIST-traceable test weights to a tolerance of $\pm 0.05$ lbs before baseline data is collected.
*   **Sensor Uptime:** Terminals must maintain active cellular connection during delivery hours to prevent data gaps.

### 2.2 Telemetry Assumptions
*   **Barcode Compliance:** We assume that at least 95% of target protein deliveries are marked with readable barcodes (GS1, EAN, or supplier specific). If a barcode is damaged, the clerk manually inputs the box ID.
*   **Scanning Consistency:** Clerks must weigh every individual box of qualified high-value proteins. Bulk weighing is not permitted during the pilot as it masks individual box weight discrepancies.

### 2.3 Operational Participation & Governance Assumptions
*   **Staff Neutrality:** Kitchen staff must not receive pre-pilot coaching on portion control or trim discipline before the start of Week 1 (Silent Baseline).
*   **Override Authorizations:** Supervisors must log an alphanumeric text justification for every warning gate override. Generic inputs (e.g., "OK", "override") are logged as non-compliant events.

---

## 3. Financial Mechanics of the Pilot

The pilot operates under a fixed-fee structure to cover initial logistics and calibration:

*   **Fixed Fee:** $1,550 per store (one-time operational deployment and calibration fee, covering terminal hardware delivery, setup, and remote telemetry monitoring).
*   **Zero Integration Cost:** Bypasses local IT integration and POS database work during the pilot phase, eliminating custom software development expenses.
*   **Audit Return:** The pilot concludes with a formal presentation of the **Executive Variance & Recovery Assessment**, providing the CFO and COO with verified, auditable data points to evaluate permanent deployment viability.
