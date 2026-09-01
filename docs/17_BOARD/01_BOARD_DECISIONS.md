# AGV Ventures — Official Board Decisions Registry

**Classification:** CONFIDENTIAL · Boardroom Governance  
**Directory Scope:** AGV Ventures Portfolio  
**Status:** AUTHORITATIVE REGISTER  

---

## 1. Approved Decisions

### Decision BD-001: Monday 11:00 AM Compliance Lockout (The Garcia Rule)
*   **ID:** `BD-001`
*   **Date:** 2026-04-20
*   **Title:** Monday 11:00 AM Inventory Compliance Lockout
*   **Context:** General Managers at pilot and production stores frequently delay cycle count submissions, causing P&L variance drift and retrospective data reconciliation delays.
*   **Decisão:** If a store fails to submit its weekly cycle count by Monday 11:00 AM local time, system access is locked, blocking dashboard and operational updates.
*   **Justificativa:** Establishes weekly operational discipline. Without a hard enforcement gate, self-reported data compliance drops by $>40\%$.
*   **Impacto:** Enforces real-time operational compliance; secures inventory data completeness.
*   **Owner:** VP of Operations
*   **Status:** APPROVED
*   **Próxima revisão:** 2026-10-20

---

### Decision BD-002: Staged 30-Day Pilot Framework
*   **ID:** `BD-002`
*   **Date:** 2026-04-26
*   **Title:** Staged 30-Day Pilot Assessment Model
*   **Context:** Introducing new technology into kitchens causes immediate behavioral change (Hawthorne effect), masking true baseline operational variances.
*   **Decisão:** All enterprise pilots must follow a strict 30-day roadmap: Week 1 operates in "Silent Baseline" mode (passive background telemetry collection, zero alerts), followed by Weeks 2–4 in "Active Governance" mode (warning gates and supervisor overrides active).
*   **Justificativa:** Establishes an uninfluenced baseline of supplier discrepancies and trim losses, providing proof of true EBITDA leakage.
*   **Impacto:** Validates actual ROI and variance recovery opportunities within 30 days.
*   **Owner:** Director of Deliveries & Pilots
*   **Status:** APPROVED
*   **Próxima revisão:** 2026-10-26

---

### Decision BD-003: Standalone Cellular Hardware Architecture
*   **ID:** `BD-003`
*   **Date:** 2026-05-04
*   **Title:** Standalone Cellular Hardware Ingestion Nodes
*   **Context:** Custom integrations with restaurant POS networks and corporate databases create massive IT queue delays, blocking pilot conversions.
*   **Decisão:** All pilot dock terminals (Dock-Scan V1) and prep scales (Prep-Scale V2) must operate using standalone cellular communication nodes, bypassing local store network infrastructures entirely during the diagnostic phase.
*   **Justificativa:** Reduces enterprise sales friction by bypassing corporate IT security queues, shortening deployment timelines from months to days.
*   **Impacto:** Achieves zero local IT footprint for target stores, speeding up sales velocity.
*   **Owner:** Chief Technology Officer (CTO)
*   **Status:** APPROVED
*   **Próxima revisão:** 2026-11-04

---

### Decision BD-004: Protein-First Domain Focus
*   **ID:** `BD-004`
*   **Date:** 2026-05-18
*   **Title:** Focus Exclusively on High-Value Proteins in Initial Phase
*   **Context:** Expanding the platform to cover seafood, produce, and labor too early dilutes core development focus and slows down pilot execution.
*   **Decisão:** Prioritize core software development and telemetry testing exclusively on high-value protein categories (Beef, Pork, Chicken, Bacon) for the first 3 enterprise pilots.
*   **Justificativa:** Proteins represent 60–80% of total restaurant food cost variable expenses. Securing this category yields the highest immediate EBITDA recovery.
*   **Impacto:** Solidifies product-market fit before scaling to secondary categories.
*   **Owner:** CEO / Founder
*   **Status:** APPROVED
*   **Próxima revisão:** 2026-11-18

---

### Decision BD-005: Automatic Database Scoping
*   **ID:** `BD-005`
*   **Date:** 2026-06-28
*   **Title:** Enforcement of Automated Prisma Tenant Isolation
*   **Context:** Manual query filtering by `company_id` is highly susceptible to developer error, creating a massive risk of cross-tenant data leaks.
*   **Decisão:** Freeze frontend feature deployment to implement global Prisma query extensions that automatically scope database reads and writes to the tenant context.
*   **Justificativa:** Secures the SaaS platform's multi-tenant architecture, satisfying SOC 2 security compliance guidelines.
*   **Impacto:** Mitigates enterprise client liability risks.
*   **Owner:** Chief Technology Officer (CTO)
*   **Status:** APPROVED
*   **Próxima revisão:** 2026-12-28
