# PILOT PLAYBOOK STRUCTURE
## BRASA HQ — Central Strategic Memory Repository
### Phase 1.5 — Authoritative Deployment Manual

**Document Version:** 1.0.0  
**Classification:** Enterprise Operational Confidential  
**Owner:** Director of Deployment & Customer Success  
**Last Reviewed:** 2026-05-26  
**Status:** RATIFIED  

---

## 1. Executive Summary

The **BRASA Pilot Playbook** defines the standard operational methodology for deploying, calibrating, and validating BRASA OS at enterprise target locations. To secure contract conversions, the pilot must not feel like an experimental trial; it must function as a **staged margin-recovery audit**. This playbook details the pre-pilot preparation, dock receiving rules, manager training, success metrics, and commercial milestones required to convert pilot locations into permanent, network-wide enterprise contracts.

---

## 2. Strategic Importance

Without a standardized playbook, pilots are executed ad-hoc, resulting in:
- Inconsistent data collection, making it impossible to prove margin recovery.
- Store manager resistance due to lack of structured onboarding.
- Implementation delays caused by custom IT integrations.
- Churned accounts because success criteria were undefined at the start.

Establishing a repeatable methodology makes deployments predictable and scalable.

---

## 3. Enterprise Relevance

Enterprise hospitality groups and government agencies expect structured deployment methods.
- **VPs of Operations:** Need to see that pilots will not disrupt service or delay dock receiving.
- **CFOs:** Require clear, auditable validation of cost recovery before approving capital expenditures.
- **District Managers:** Expect clear playbooks, training scripts, and automated compliance alerts.

This playbook gives corporate decision-makers confidence that the pilot will be executed with absolute professionalism.

---

## 4. Operational Impact

- **Customer Success Engineers:** Must use the store onboarding checklists and calibration procedures.
- **Restaurant General Managers (GMs):** Are guided through a 4-week step-by-step compliance roadmap.
- **Dock Personnel:** Follow a strict "Scan-Before-Commit" box receiving protocol.

---

## 5. Risks if Ignored

- **Data Contamination:** Incomplete or corrupted scans during the pilot, making baseline calculations invalid.
- **Manager Fatigue:** Store managers ignoring deadline rules, resulting in empty dashboards and loss of executive interest.
- **Delayed Sales Conversions:** Failing to define contract conversion thresholds (e.g., proving a 2% margin recovery) before the pilot starts, leading to indefinite extensions without revenue.

---

## 6. Recommended Structure

The BRASA Pilot Playbook is structured across the following stages:

### 6.1 Phase 1 — Pre-Pilot Calibration & Setup (Weeks -2 to -1)
* **IT Alignment:** Verify POS report endpoints (Aloha, Toast, etc.). Ensure CORS access is configured for the target tenant's subdomains.
* **Hardware Delivery:** Send BRASA mobile scanner kits to the target dock. Verify cellular or local Wi-Fi connectivity at the receiving area.
* **Database Provisioning:** Create the `Company`, `Store`, `User`, and `CorporateProteinSpec` records in the database. Ensure all active protein cuts are associated with the correct spec weights.

### 6.2 Phase 2 — The Observation Baseline (Week 1)
* **Silent Mode Operation:** Managers perform standard receiving without automated alerts or blocks. 
* **Baseline Measurement:** The system records raw transaction data to find the baseline anomaly rate and weight variance.
* **POS Integration Verification:** Confirm covers, check sales, and lunch/dinner splits are flowing correctly.

### 6.3 Phase 3 — The Active Governance Phase (Weeks 2–4)
* **SOP Deployment:** Store clerks begin using the dock scanner interface. All box deliveries must be scanned and checked.
* **Enforcing deadliness:** The Monday 11:00 AM inventory lockout and Wednesday forecast lock are activated.
* **Sentinel monitoring:** Continuous scanning for fat-finger errors and ribs unit confusion is enabled.

### 6.4 Dock Receiving Procedures (Mandatory SOP)
1. **Dock Clerk receives shipment:** Clerks must locate the supplier label.
2. **Scan Barcode:** Scan the GS1-128 or EAN barcode.
3. **Inspect Weight:** The system checks the weight against the expected spec.
4. **Resolution Gate:**
   - If weight matches: Box status becomes `APPROVED`; count is added to inventory.
   - If weight deviates: System flags a warning. Clerk must upload an OCR photo. Status becomes `REVIEW_REQUIRED` (requires manager approval).
   - If override is needed: General Manager must enter their supervisor credentials and record a mandatory reason text.

### 6.5 Executive Deliverables & Success Metrics
The pilot must prove the following metrics to trigger contract conversion:
- **Telemetry Integrity:** >95% of all received protein boxes successfully scanned at the dock.
- **Governance Compliance:** >90% of weekly inventory counts submitted before the Monday 11:00 AM deadline.
- **Proven Margin Recovery:** Stop-loss audit proving a minimum 2% reduction in unaccounted protein variance.
- **Supplier Correction:** Documented cases where the system detected supplier weight shortages, leading to invoice credits.

### 6.6 Contract Conversion Logic
Upon completion of Week 4, if the success metrics are met, the customer contract automatically transitions from the Pilot Phase to the **Active Enterprise Subscription** (value-based per-pound fee or monthly subscription fee per location).

---

## 7. Immediate Next Steps (Next 30 Days)

1. **Format Scanner Kits:** Assemble 5 standardized "BRASA Scanner Kits" (pre-configured mobile terminals + rugged cases) ready for shipping.
2. **Draft Onboarding SOPs:** Create a single-page visual guide for dock clerks showing "How to scan a meat box in 3 steps."
3. **Verify Hard Rock Pilot:** Align the Hard Rock pilot execution with this playbook, focusing on Phase 2 (Aloha verification).

---

## 8. Long-Term Evolution Path (12-36 Months)

- **Year 1:** Standardize this playbook across all B2B restaurant pilots.
- **Year 2:** Build self-service training modules and video certification scripts for store managers, eliminating the need for on-site customer success engineers.
- **Year 3:** Integrate the pilot tracking metrics into the SRE Command Center, allowing corporate auditors to monitor all active pilots globally from a single console.

---

*This document is maintained by the Customer Success Operations Team. Updates require executive review.*

*BRASA HQ — PILOT PLAYBOOK STRUCTURE: Strategic Operating System Directive*
