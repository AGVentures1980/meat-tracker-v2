# AGV Ventures & Brasa Meat Intelligence OS
**Context Synchronization & State Checkpoint**
*Last Updated: March 31, 2026 (v4.2 Enterprise Release)*

---

## 1. The Core Thesis
AGV Ventures is a holding company and technology firm building **Brasa Meat Intelligence OS**, an enterprise-grade platform designed to eradicate "EBITDA Leakage" in high-volume steakhouses (e.g., Texas de Brazil, Outback, Fogo de Chão). It replaces analog inventory methods (clipboards) with real-time algorithmic governance using industrial GS1-128 barcode scanners.

## 2. Platform Architecture
- **Client (Executive Dashboard):** React + Vite + TailwindCSS + Lucide Icons. Running on port 5173.
- **Server (Backend API):** Node.js + Express + Prisma ORM + PostgreSQL (`POSTGRES_V3_LINK`). Running on port 8080.
- **AGV Website (Marketing/Lead Gen):** React + Vite. Running on port 5174.
- **Deployment:** Railway (CI/CD connected to the `pitch-ready` branch on GitHub).

## 3. Operations & Nomenclature Standard
The system strictly enforces "Enterprise Hospitality" terminology, explicitly rejecting generic startup vocabulary.
- *Process Waste* ➔ **Yield & Variance Log**
- *Pull to Prep* ➔ **Daily Prep Par Levels**
- *Weekly Pulse* ➔ **Period End Inventory**
- *Shift Command Center* ➔ **Manager Shift Log**
- *Corporate DB Specs* ➔ **Master Recipe & Specs**
- *System Sales* ➔ **Top-Line Revenue**
- *System Labor* ➔ **Consolidated Labor %**

## 4. Hierarchy & Access Rules
The system maps complex corporate hierarchies via the `Scope` model:
1. **Master / Global Admin (Alexandre/Rodrigo):** Full access to Network Command Center, Subscription Billing, Legal Vault, and Switch Company multi-tenant features.
2. **Director / Corporate:** Access to the CFO Monthly Report, Performance Audit, and "Executive Financial Briefs".
3. **Joint Venture Partner (JVP) / Franchisee:** Sees a filtered JVP Dashboard focused on their equity stake.
4. **Area Manager:** Governs a specific sub-set of stores. Reads variance logs and audits principals.
5. **Operating Principal / GM:** Store-level execution. Locked by the "Accountability Gate" (Garcia Rule) requiring daily invoice entry before accessing the Shift Command Center.

## 5. Strategic IP & Legal Posture
AGV Ventures is heavily fortified legally for scaling and Private Equity engagement:
- **Contracts Vault:** Master SaaS Agreements, Pilot MOUs, NDA, IP Assignment Agreements.
- **Copyright:** Source code is registered. USPTO strategy mapping intact.
- **The 90-Day Pilot Trap:** The commercial strategy dictates offering a 90-day pilot that guarantees to stop the financial bleeding or the contract is nullified. Converts to a $1,500/mo enterprise SaaS fee.

## 6. Social Media & Go-To-Market
Current LinkedIn strategy is "Operação Zero Paciência" (Operation Zero Patience):
- Target: C-Level, CFOs, Private Equity Partners.
- Tone: Aggressive, authoritative, exposing the negligence of "analog" restaurant management.
- Lead routing: Traffic directed to `alexgarciaventures.co/brasa` or `/walkthrough`.

---
*Instructions for AI Agent upon reading this file: Assume the persona of an elite Product Architect and Strategic Advisor. Do not ask for basic context. Operate immediately at a C-suite/Architect level.*
