# BRASA Meat Intelligence OS
## System Architecture
**Classification:** Internal Technical Documentation  
**Version:** 1.0  
**Phase:** 1.5 — Operational Intelligence Preservation  
**Status:** Observation-only. No architectural changes proposed.

---

## 1. System Overview

BRASA is a multi-tenant operational telemetry platform purpose-built for protein-intensive food service operations. It is not a dashboard application. It does not approximate food costs. It instruments the exact chain of custody for every protein unit from the receiving dock through kitchen production to guest consumption.

The system answers a question no existing food service software answers today:

> **At exactly what node in the supply chain did a variance occur, and what is its financial attribution?**

This requires instrumentation at the receiving level (barcode/GS1 scan), the production level (SmartPrep/yield tracking), the delivery channel level (OLO decomposition), and the point-of-sale level (BurgerIntelligence/Aloha integration) — simultaneously, across multiple tenants, with strict data isolation between them.

---

## 2. High-Level Layer Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (React/Vite)                    │
│  SmartPrep · WeeklyInventory · OwnerTerminal · EnterpriseDashboard  │
│  DeliveryPage · RegionalOverview · CommandCenter · ReportsPage      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ HTTPS / WebSocket
┌───────────────────────────────▼─────────────────────────────────────┐
│                     MIDDLEWARE LAYER (Express)                       │
│  auth.middleware (JWT + tenant) · garciaRule (governance lockout)   │
│  rateLimiter · idempotency · permissionMiddleware · SecurityMiddleware│
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│                      CONTROLLER LAYER (57 files)                     │
│  ReceivingController · SmartPrepController · DeliveryController     │
│  BurgerIntelligenceController · DashboardController · WasteController│
│  ForecastController · InventoryController · ExecutiveController     │
│  CompanyController · UserController · AuthController · (+ 45 more)  │
└──────────────┬────────────────────────────┬────────────────────────-┘
               │                            │
┌──────────────▼────────────┐  ┌────────────▼──────────────────────────┐
│     ENGINE LAYER          │  │         SERVICE LAYER (40+ files)      │
│  MeatEngine.ts            │  │  ComplianceEngine · FraudIntelligence  │
│  ComboParser.ts           │  │  LabelDataFusionEngine · BarcodeGS1    │
│  DataIntegrityWatchdog    │  │  BarcodeNZParser · YieldEngine         │
│  ProteinLifecycleEngine   │  │  InventoryEngineService · IntakeService│
└──────────────┬────────────┘  │  ReceivingEngineService · AuditService │
               │               │  TenantDeletionEngine · VaultService   │
               │               └────────────────────┬──────────────────┘
               │                                    │
               └──────────────┬─────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│                        AGENT LAYER                                   │
│  HolidayPredictorAgent (seasonal forecasting)                        │
│  PilotSentinelAgent (autonomous data integrity monitoring)           │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│                    ASYNC PROCESSING LAYER                            │
│  intakeQueue (BullMQ/Redis) · alohaProcessor · ocrProcessor         │
│  OutboxPoller · StuckJobDetector                                     │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│                    PERSISTENCE LAYER                                 │
│  PostgreSQL (via Prisma ORM) · Redis (BullMQ queue backend)         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Layer-by-Layer Description

### 3.1 Client Layer

Built with React (TypeScript) and bundled via Vite. The client is a multi-page SPA with role-based routing. Tenants are identified at runtime via subdomain (e.g., `outback.brasameat.com`), which triggers the appropriate theme, feature flags, and API scoping.

Key pages by operational function:

| Page | Function |
|---|---|
| `SmartPrepPage` | Daily protein preparation recommendations |
| `WeeklyInventory` | Cycle count submission (triggers Garcia Rule compliance) |
| `DeliveryPage` | OLO/delivery order management and decomposition |
| `OwnerTerminal` | Store-level executive view |
| `EnterpriseDashboard` | Multi-tenant network-level view |
| `RegionalOverview` | Area manager cross-store visibility |
| `CommandCenter` | SRE/Admin operational control |
| `ReportsPage` | Downloadable operational reports |
| `TrainingPage` | Staff training and certification tracking |

### 3.2 Middleware Layer

All requests pass through the middleware chain before reaching any controller. Order is significant.

1. **`auth.middleware.ts`** — Validates JWT, extracts `userId`, `storeId`, `companyId`, `role`. Attaches to `req.user`. This is the tenant isolation entry point.
2. **`garciaRule.ts`** — On applicable routes, enforces Monday 11AM inventory compliance lockout. Fail-open on DB error (intentional).
3. **`permissionMiddleware.ts`** — Role-based action authorization (e.g., only directors can edit locked forecasts).
4. **`rateLimiter.ts`** — Per-IP rate limiting to prevent API abuse.
5. **`idempotency.ts`** — Prevents duplicate submissions on POST endpoints.

### 3.3 Controller Layer

57 HTTP request handlers. Controllers are the thinnest layer — they validate input, call services or engine, and return responses. Controllers must not contain business logic.

Critical controllers by operational domain:

| Domain | Controllers |
|---|---|
| Receiving/Dock | `ReceivingController` (43KB — largest in system) |
| Production | `SmartPrepController`, `WasteController` |
| Delivery/OLO | `DeliveryController` |
| POS Integration | `BurgerIntelligenceController`, `AlohaWebhookController` |
| Forecasting | `ForecastController` |
| Inventory | `InventoryController`, `WasteController` |
| Executive | `ExecutiveController`, `DashboardController`, `enterpriseDashboardController` |
| Identity/Auth | `AuthController`, `UserController` |
| Compliance | `ComplianceController`, `ValidationController` |
| SRE/Admin | `SREController`, `SRECommandController`, `DebugController` |

### 3.4 Engine Layer

The operational core of the platform. Contains irreplaceable business logic accumulated through real-world operational experience.

| File | Role |
|---|---|
| `MeatEngine.ts` | Central telemetry aggregation: dashboard stats, protein group logic, delivery firewall, shift-aware guest calculation, executive stats, network health matrix |
| `ComboParser.ts` | Decomposes OLO/delivery combo items into constituent protein weights |
| `DataIntegrityWatchdog.ts` | Structural data validation layer |
| `ProteinLifecycleStrictEngine.ts` | Enforces protein lifecycle state machine (ordered → received → processed → consumed) |

> **Warning:** `MeatEngine.ts` contains operational heuristics that must not be modified without full understanding of their operational origin. See `GOVERNANCE_INVARIANTS.md`.

### 3.5 Service Layer

40+ specialized services. Each service handles one concern. Key services:

**Barcode/OCR Intelligence:**
- `BarcodeDecisionEngine.ts` — Confidence-scored parser selection (GS1 > NZ Proprietary > Serial)
- `LabelDataFusionEngine.ts` — Multi-source data fusion with per-field provenance tracking
- `BarcodeGS1Parser.ts` — GS1-128 Application Identifier parsing (AI 01=GTIN, 3201/3202=weight-lbs, 3101/3102=weight-kg)
- `BarcodeNZParser.ts` — Taylor Preston (NZ Lamb) proprietary label format parser
- `CanonicalIdentityGenerator.ts` — Canonical product identity resolution across barcode formats

**Compliance & Fraud:**
- `ComplianceEngine.ts` — Multi-phase receiving compliance decision (ACCEPTED/REJECTED/REVIEW_REQUIRED)
- `FraudIntelligenceEngine.ts` — Risk scoring and pattern detection (WEIGHT_CLONING, EXCESSIVE_OVERRIDE, SHELL_GAME)

**Operational Analytics:**
- `YieldEngine.ts` — Protein yield variance calculation
- `InventoryEngineService.ts` — Inventory cycle processing
- `ReceivingEngineService.ts` — Receiving event orchestration
- `ConsumptionAllocationEngine.ts` — Consumption attribution across service types
- `TrendEngine.ts` — Historical trend analysis
- `TripleBaselineService.ts` — Three-baseline performance comparison (YTD, PTD, target)

**Infrastructure:**
- `AuditService.ts` / `auditLogger.ts` — Governance audit trail
- `OutboxService.ts` — Transactional outbox for reliable event delivery
- `TenantDeletionEngine.ts` — Safe multi-tenant data removal
- `EmailService.ts` — Transactional notifications

### 3.6 Agent Layer

Autonomous agents that operate independently of the HTTP request cycle.

**`HolidayPredictorAgent.ts`**
- Purpose: Predicts expected guest counts based on holidays and seasonal patterns
- Invocation: Called from `SmartPrepController` during daily prep recommendation generation
- Output: Adjusted guest count forecasts for lunch and dinner services

**`PilotSentinelAgent.ts`**
- Purpose: Autonomous data integrity monitoring
- Invocation: Designed to run via cron job (currently on-demand)
- Checks: Fat-finger detection, order anomaly detection, Beef Ribs unit confusion, systemic supplier variance
- Alert delivery: Writes deduplicated alerts to `OwnerVaultMessage` table

### 3.7 Queue / Async Processing Layer

Built on BullMQ with Redis as the queue backend. Currently running in Redis mock (in-memory) mode.

| Worker | Queue | Purpose |
|---|---|---|
| `intakeWorker` | `data-intake` | Processes `GoldenDatasetItem` records through parse → normalize → validate pipeline |
| `alohaProcessor` | `aloha-ingestion` | Processes end-of-day Aloha POS webhook payloads |
| `ocrProcessor` | — | Processes OCR extraction from delivery ticket images |
| `OutboxPoller` | — | Polls the transactional outbox table and delivers events reliably |
| `StuckJobDetector` | — | Detects workers that crashed while processing (stuck in PROCESSING state) |

All workers implement idempotency guards — they check current state from the database before executing any side effects. A job that has already been processed will be dropped (NO-OP) rather than reprocessed.

---

## 4. Multi-Tenant Enforcement Model

Tenant isolation is enforced at three independent layers:

1. **Subdomain Resolution** — At request entry, the subdomain is resolved to a `company_id` (e.g., `outback.brasameat.com` → company UUID). This is set in the request context.
2. **JWT Enforcement** — The JWT token contains `companyId`. The auth middleware validates that the token's `companyId` matches the request context.
3. **Database Query Scoping** — Every Prisma query that touches company-scoped data applies a `company_id` WHERE clause. This is enforced in `MeatEngine`, all controllers, and all services. It is not a single central filter — it is applied individually on every query.

> **Critical:** The triple-layer enforcement means that even if one layer fails, two others remain active. This is the correct defense-in-depth approach for a multi-tenant SaaS platform.

---

## 5. Receiving / Barcode / Compliance Pipeline

This is the highest-value operational flow in the platform:

```
Physical box arrives at dock
        ↓
Receiver scans barcode(s) with mobile device
        ↓
BarcodeDecisionEngine.parse()
  → Try GS1_128 parser (confidence scored)
  → Try NZ_PROPRIETARY parser (Taylor Preston)
  → Try SERIAL parser (fallback)
  → Select highest-confidence result
        ↓
LabelDataFusionEngine.fuse()
  → Merge barcode parse results
  → Merge OCR extraction results (if image provided)
  → Tag each field with provenance (source + confidence)
  → Detect conflicts between sources
        ↓
ComplianceEngine.evaluate()
  → Pre-flight: conflict check → REVIEW_REQUIRED if conflict
  → Phase 1: Canonical identity resolution
  → Phase 2: Corporate Protein Spec match (GTIN lookup)
  → Phase 3: Supplier Rule match
  → Phase 4: Benchmark/baseline fallback
  → Output: ComplianceDecision (ACCEPTED/REJECTED/REVIEW_REQUIRED)
        ↓
FraudIntelligenceEngine.execute()
  → Risk score calculation (0-100)
  → Pattern detection (WEIGHT_CLONING, EXCESSIVE_OVERRIDE, SHELL_GAME)
  → Supplier behavior profiling
  → Output: FraudEvaluationProfile with riskScore + riskLevel
        ↓
ProteinBox record created in database
  (includes: weight, GTIN, compliance status, fraud score, provenance)
        ↓
AuditEvent logged
        ↓
Dashboard visibility (receiving events appear in real-time)
```

---

## 6. Dashboard Data Flow

```
API request → DashboardController
  → MeatEngine.getDashboardStats(storeId, companyId)
    → Fetch store config (targets, flags, prices)
    → Fetch OrderItems (sales) for period
    → Fetch DeliverySales → apply Delivery Firewall
    → Calculate shift-aware guests (lunch/dinner)
    → Calculate lbs/guest (dine-in only)
    → MeatEngine.getTopMeats()
      → Fetch CompanyProduct ledger (Villains, Dinner-only flags)
      → Apply Protein Group Aggregation
      → Apply Gaucho Chicken bounded logic
      → Apply Bacon Wrapping ratio
    → Return: totalLbs, lbsPerGuest, costPerGuest, theoreticalRevenue, topMeats
```

---

## 7. Deployment Topology

| Component | Platform | Notes |
|---|---|---|
| Backend API | Railway (Docker) | Single instance |
| Frontend | Railway (Vite static) | Built and served |
| Database | Railway PostgreSQL | Single instance, no read replicas |
| Queue Backend | Redis (in-memory mock) | Jobs lost on restart — not production-hardened |
| Custom Domains | Railway + DNS | Subdomains per tenant |
| Logging | Console (stdout) | No structured logging or APM |

See `DEPLOYMENT_REALITY.md` for full deployment assessment and scaling constraints.
