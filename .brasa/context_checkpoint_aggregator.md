# Brasa Meat Intelligence OS
## 🧠 Master Context Checkpoint (Aggregated: March 2026)

**Purpose:** This file serves as the definitive memory bank for the AGV Ventures/Brasa Meat Intelligence project. Provide this file to the AI Agent in future sessions to instantly restore deep architectural context, recent security patches, and ongoing objectives without losing momentum.

---

### 🏛️ Core Architecture & State
*   **Tenant Isolation Model:** Strict Multi-Tenant architecture. The backend explicitly relies on the `x-company-id` header (injected via `AuthContext`) for all cross-tenant data sourcing, overriding the `user.companyId` fallback to prevent Master Admins from seeing data bleed across brands (e.g., Texas de Brazil vs. Fogo de Chão).
*   **Infrastructure:** Deployed on **Railway** tracking the `pitch-ready` Git branch.
*   **Tech Stack:** React (Vite) + Tailwind CSS (Frontend) | Node.js + Express + Prisma ORM + PostgreSQL (Backend).
*   **Operational Governance:** Features the "Garcia Rule" (mandatory daily waste logging), offline-first GS1-128 barcode parsing, and predictive AI baselines.

### 🛡️ Recent Security & System Patches (March 15 - March 24)
1.  **The "Pente Fino" Anti-Leak Sweep:**
    *   Patched severe cross-tenant data leaks in `DashboardController` (`getAuditLogAnalysis`, `getVillainDeepDive`, `getProjectionsData`, `getPerformanceAudit`) and `AnalystController` (`getRoiReport`, `getAnalystScan`). 
    *   Patched `UserController` (`getHierarchy`) to ensure Master Admin visual graphs respect the `x-company-id` header.
    *   Fixed the React `fetch` instances in `DataAnalyst.tsx` to manually inject the active company context.
2.  **Store Scoping & Area Managers:**
    *   Hardened `UserController` to ensure Area Managers can *only* view, add, and manage employees for stores explicitly assigned to their Area scope.
3.  **Dynamic Analyst Rationales:**
    *   Removed hardcoded array-index logic for "Pilot Stores". The Analyst UI now reads the actual `store.store_name` string to assign pinpoint-accurate descriptions for Fogo de Chão (Santa Monica, Rancho Cucamonga, El Segundo), TDB (Addison, Miami, Las Vegas), and Outback (Plano, Dallas, Fort Worth).
4.  **Route Precedence Fix:**
    *   Resolved the connection error on Executive Analyst by fixing the route execution order for `/stats/report-card` versus generic `/stats/:storeId`.
5.  **Company Selector:**
    *   Restricted the "Owner Intelligence Center" button on the Company Selector page to Admins only.

### ⚖️ Legal Shielding & Pitch Prep
*   Finalized a comprehensive legal barrier protecting the software's IP before pilot launches.
*   Setup AGV Ventures LLC as the holding entity. 
*   Prepared all core document templates: **Master SaaS Agreement**, **Pilot Testing Agreements**, **NDAs**, **IP Assignments**, and US Copyright / Trademark strategies.

### 🎯 Current Focus & Next Operations
*   **Deal Desk & Contract Automation:** Working within `client/src/components/SaaS/DealDeskModal.tsx` and `contracts.routes.ts` to implement automated signature dispatches (via DocuSign `.pem` private key) for the Master SaaS Agreement. 
*   **Ongoing Monitoring:** Continue sweeping the dashboard UI/UX to ensure maximum stability and "Wow" factor for the impending Texas de Brazil / Outback / Fogo de Chão pilot presentations.

---
**Instruction for AI:** If you have just read this file, your memory is perfectly restored. Acknowledge this checkpoint to the user and ask what specific component they wish to develop or audit next.
