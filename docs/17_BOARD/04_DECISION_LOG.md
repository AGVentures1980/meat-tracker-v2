# AGV Ventures — Strategic Decision Log

**Classification:** CONFIDENTIAL · Architecture & Strategy  
**Directory Scope:** AGV Ventures Portfolio  
**Status:** ACTIVE LOG  

---

## 1. Decision Records

### Record DR-001: Monday 11:00 AM Count Lockout (The Garcia Rule)
*   **Decisão:** Enforce a hard system access lockout if a store fails to submit weekly cycle counts by Monday 11:00 AM local time.
*   **Por que foi decidido:** Without immediate consequences, GMs delay counts, corrupting the week's theoretical food cost calculations and delaying executive visibility.
*   **Alternativas descartadas:**
    - *Email notifications*: Discarded because email warnings are routinely ignored by busy kitchen managers.
    - *Financial penalties*: Discarded because it creates political friction and HR complications.
*   **Riscos aceitos:** 
    - Temporary lockout of compliant managers during network glitches. We mitigated this by setting the lockout verification database check to fail open on query errors.

---

### Record DR-002: Standalone Cellular Hardware Architecture
*   **Decisão:** Deploy cellular-enabled, pre-calibrated dock terminals and prep scales directly to pilot locations, bypassing corporate IT networks.
*   **Por que foi decidido:** Corporate IT security reviews for enterprise hospitality groups (casinos, multinational brands) routinely take 3–6 months. Bypassing their networks enables immediate pilot deployments.
*   **Alternativas descartadas:**
    - *Dine-in Wi-Fi integration*: Discarded because restaurant Wi-Fi is notoriously unstable and subject to firewall blocks.
    - *Local Server software installation*: Discarded due to security audits and OS compatibility overhead.
*   **Riscos aceitos:**
    - Cellular dead zones inside underground kitchen docks. We mitigated this by implementing local client-side offline buffering (`IndexedDB`) to queue transactions until a cell handshake succeeds.

---

### Record DR-003: Dynamic Protein Group Aggregation
*   **Decisão:** Implement custom protein group aggregation (e.g. mapping Gaucho Chicken and Kitchen Salad Chicken into distinct metrics) inside `MeatEngine.ts`.
*   **Por que foi decidido:** Rodizio operations process meats differently based on service formats. Simple cost-sheet tracking misses the shift-aware and format-aware yield variations.
*   **Alternativas descartadas:**
    - *POS-only item tracking*: Discarded because POS items (e.g. combo plates) hide the constituent protein weights.
    - *Generic recipe software*: Discarded because generic systems do not support rodizio-style continuous service models.
*   **Riscos aceitos:**
    - Development overhead in maintaining hardcoded heuristics for specific store menus. We mitigated this by planning a dynamic DB-driven `RecipeLedger`.

---

### Record DR-004: Freeze Frontend in Favor of Backend Hardening
*   **Decisão:** Temporarily freeze new frontend visual dashboard features to focus resources on backend multi-tenant security and queue persistence.
*   **Por que foi decidido:** Investor and enterprise CTO due diligence reviews will immediately fail if tenant scoping is manual or job queues run on an in-memory mock that loses data on server restarts.
*   **Alternativas descartadas:**
    - *Concurrent parallel development*: Discarded due to single-architect bandwidth constraints.
    - *Outsourcing backend development*: Discarded to prevent founder IP concentration leaks before SOC 2 certification.
*   **Riscos aceitos:**
    - Temporary delay in delivering visual custom dashboard requests for pilot GMs.
