# FOUNDER DEPENDENCY REDUCTION MAP
## BRASA HQ — Central Strategic Memory Repository
### Phase 1.5 — Authoritative Risk Mitigation Plan

**Document Version:** 1.0.0  
**Classification:** Enterprise Strategic Confidential  
**Owner:** Director of Human Resources & Corporate Governance  
**Last Reviewed:** 2026-05-26  
**Status:** RATIFIED  

---

## 1. Executive Summary

The **BRASA Founder Dependency Reduction Map** is the definitive strategy for transferring operational, technical, and commercial knowledge out of founder memory and institutionalizing it into corporate systems. The current "Bus Factor" of the company is **1**. The platform's ongoing deployment, database migrations, customer onboarding, and executive relationship negotiations require the founder's direct involvement. This document catalogs these dependencies and provides a structured de-risking roadmap to ensure operational continuity and prepare the company for enterprise audit standards.

---

## 2. Strategic Importance

Founder concentration is one of the highest operational risks for early-stage infrastructure platforms.
- If the founder is unavailable, production system incidents (such as database migrations or server crashes) cannot be resolved.
- New customer onboarding stalls because there is no automated tenant registration or documented deployment process.
- Generalized metrics from other platforms are introduced that violate kitchen realities.

Reducing this dependency is essential to prove the company's maturity to investors, buyers, and large-scale clients.

---

## 3. Enterprise Relevance

Enterprise buyers, legal departments, and corporate insurance providers evaluate operational stability.
- **Enterprise CTOs:** Will not sign multi-year contracts if support SLAs depend on a single developer's availability.
- **Due Diligence Evaluators:** Require documented runbooks, disaster recovery plans, and delegated database access.
- **Governance Committees:** Require independent proof that operational truth calculations are repeatable and secure.

This mitigation map demonstrates to stakeholders that BRASA is actively transitioning from a founder-led project into resilient enterprise infrastructure.

---

## 4. Operational Impact

- **Engineering:** Development workflows must be documented. System setup and database migrations are automated through standard scripts rather than manual commands.
- **Customer Success:** Onboarding coordinators use scripts and checklists to provision new clients independently.
- **Customer Support:** Operations teams utilize structured runbooks to resolve anomalies without escalating to the founder.

---

## 5. Risks if Ignored

- **Downtime and SLA Penalties:** Prolonged system outages if database failures coincide with founder unavailability, leading to financial penalties.
- **Operational Stagnation:** The company's onboarding capacity is limited by the founder's time, delaying the conversion of regional pilots.
- **Audit Disqualification:** Disqualification during enterprise tech audits due to the absence of documented recovery plans, connection access logs, or operational roles.

---

## 6. Recommended Structure

The Founder Dependency Reduction Map identifies risks across three key domains and defines remediation roadmaps:

### 6.1 Domain 1: Trapped Domain & Heuristic Knowledge
* **Risk Register:**
  - *Heuristic Constants:* Derivation of the `0.25` bacon ratio, Gaucho chicken target caps, and ribs unit filters live inside code files with zero JSDoc comments.
  - *80/20 Villain Approximation:* The assumption that 80% of overspending is Villain-driven is hardcoded at line 634 of `MeatEngine.ts` with no operational justification.
* **Remediation Strategy:** Completed the first stage by creating `GOVERNANCE_INVARIANTS.md` and `FOUNDER_KNOWLEDGE_MAP.md`. Next stage: add named constants, inline JSDoc comments, and automated unit tests for every operational formula.

### 6.2 Domain 2: Infrastructure & Deployment Bottlenecks
* **Risk Register:**
  - *Manual Tenant Onboarding:* Provisioning a new client requires the founder to manually update PostgreSQL tables, configure DNS records, and add Railway custom domains (2–4 hours manual labor).
  - *Manual Migrations:* Prisma migrations are run manually from the founder's local terminal using production database strings.
  - *Redis Mock:* Queue jobs are processed using an in-memory mock Redis; server restarts result in silent job losses.
* **Remediation Strategy:** 
  1. Build a CLI onboarding script (`scripts/onboard-tenant.ts`) that automates database records and configuration.
  2. Implement managed, persistent Redis on Railway to eliminate background queue data loss.
  3. Integrate Prisma migration deploys into a secure CI/CD build pipeline.

### 6.3 Domain 3: Customer Relationships & Strategic Accounts
* **Risk Register:**
  - *Relational Dependency:* Core executive champions (e.g., David at Hard Rock, managing partners at Terra Gaucha) negotiate contracts directly with the founder.
  - *Pilot Calibration:* Pilot setups are adjusted on-site based on verbal operational rules.
* **Remediation Strategy:**
  1. Establish the `docs/hq/SALES_MEMORY.md` directory to record all meeting logs and stakeholders.
  2. Use the structured onboarding guidelines in `docs/hq/PILOT_PLAYBOOK.md` to hand over pilot execution to customer success engineers.
  3. Assign regional operations contacts to a dedicated accounts director.

### 6.4 The De-Risking Roadmap (Prioritized Checklist)
- **Immediate (P0 - Next 30 Days):**
  - Add inline JSDoc comments to all engine constants in `MeatEngine.ts`.
  - Establish a persistent Redis server on Railway.
  - Clean the repository root directory (move orphaned test files to `/scripts/testing`).
- **Medium Term (P1 - Next 90 Days):**
  - Build the automated tenant onboarding CLI script.
  - Implement a GitHub Actions CI/CD pipeline with build verification.
  - Create a production incident runbook for operations teams.
- **Long Term (P2 - Next 180 Days):**
  - Migrate all configuration heuristics from hardcoded values to per-tenant configuration fields in the database.
  - Automate database migrations through the CI/CD pipeline, removing local terminal production connections.

---

## 7. Immediate Next Steps (Next 30 Days)

1. **JSDoc Comment Additions:** Document the Bacon wrapping ratio, Gaucho chicken caps, and Wednesday forecast locks directly in the backend code files.
2. **Move Orphaned Files:** Move the `.old_exec_controller.ts` and `.patch` files out of the production directory to the `/docs/archive/` folder.
3. **Provision Redis:** Deploy a managed Redis instance in the Railway project and connect BullMQ to it, removing the mock.

---

## 8. Long-Term Evolution Path (12-36 Months)

- **Year 1:** Complete all P0 and P1 de-risking goals, bringing the Bus Factor of the platform from 1 to 3.
- **Year 2:** Transition to a fully automated SaaS onboarding portal where clients can register, set up locations, and input specifications without manual operations support.
- **Year 3:** Establish formal 24/7 client support SLA rotations, supported by regional teams and monitored via the SRE Command Center.

---

*This document is maintained by the Operations Governance Team. Updates require executive sign-off.*

*BRASA HQ — FOUNDER DEPENDENCY REDUCTION MAP: Strategic Operating System Directive*
