# AI ROLE SEGMENTATION
## BRASA HQ — Central Strategic Memory Repository
### Phase 1.5 — Authoritative AI Operating Framework

**Document Version:** 1.0.0  
**Classification:** Enterprise Strategic Confidential  
**Owner:** Director of Engineering & AI Integration  
**Last Reviewed:** 2026-05-26  
**Status:** RATIFIED  

---

## 1. Executive Summary

The **AI Role Segmentation Matrix** defines the operating boundaries, strengths, weaknesses, and forbidden actions for the various AI agents and models utilized across the BRASA HQ engineering, strategy, and operations ecosystem. In an AI-native development environment, using the wrong tool for a specific task leads to code regressions, architectural vanity, and strategic noise. This document segregates work between **ChatGPT, Claude, Antigravity, Gemini, Notion AI, and GitHub Copilot** to establish structured, predictable outcomes.

---

## 2. Strategic Importance

Without clear boundaries, multi-agent workflows quickly descend into "AI chaos."
- Agents overwrite each other's context, leading to broken business logic and data pollution.
- Opaque, non-deterministic generators introduce fragile code refactoring that violates governance invariants.
- High-level strategic templates get mixed with specific codebase syntax, diluting context quality.

Structuring roles ensures that each model is utilized exclusively where its semantic structure and context windows are optimized.

---

## 3. Enterprise Relevance

Enterprise partners require auditable, repeatable software delivery processes.
- **Enterprise Security Teams:** Need to verify that AI tools are not leaking proprietary customer data (such as tenant names or protein pricing) to public models.
- **Engineering Evaluators:** Need to be confident that code changes are determined by structured engineering specs, not arbitrary model choices.
- **Auditors:** Must see that automated tasks (like Sentinel alerts) run on deterministic, explainable rule sets rather than open-ended AI models.

---

## 4. Operational Impact

- **Engineers:** Know exactly which AI interface to open for code debugging, documentation updates, and automated code completion.
- **Operations & Sales:** Utilize specific writing models for customer communications without introducing code logic context.
- **System Governance:** Enforces that no AI tool is permitted to modify the database schema or core invariants without manual, human-in-the-loop review.

---

## 5. Risks if Ignored

- **Data Contamination:** Accidental exposure of proprietary tenant schemas or multi-tenant database records to public training sets.
- **Architectural Drift:** AI-driven refactoring that replaces simple, robust code (e.g., sequential loops in `MeatEngine.ts`) with complex, non-functional abstractions.
- **Token Bleed:** Subagents running out of quota or context space because they are processing irrelevant strategic documents instead of target code blocks.

---

## 6. Recommended Structure

The AI operating framework allocates roles and boundaries as follows:

### 6.1 Claude (Anthropic)
* **Operational Role:** **System Architect & Governance Writer**
* **Strengths:** High-precision logical reasoning, complex code pattern synthesis, strict adherence to formatting instructions, sophisticated prose.
* **Weaknesses:** Subject to sudden token limits under heavy, repeated context payloads.
* **Ideal Use Cases:** Generating core documentation, writing detailed implementation plans, defining backend interfaces, and troubleshooting complex state issues.
* **Forbidden Use Cases:** Repetitive autocomplete tasks; parsing raw log dumps.
* **Workflow Positioning:** Upstream strategic planner and system-level reviewer.

### 6.2 Antigravity (Google / Current Agent)
* **Operational Role:** **Active Workspace Engineer & Context Steward**
* **Strengths:** Real-time workspace execution, deep file-system search, direct multi-file code editing, and integrated execution check loops.
* **Weaknesses:** Context window constraints during large-scale repository scans if not focused.
* **Ideal Use Cases:** Performing targeted multi-file documentation additions, executing implementation plans, checking code compilations, and verifying tenant scoping filters.
* **Forbidden Use Cases:** Generating speculative strategy slides; processing offline marketing assets.
* **Workflow Positioning:** Midstream execution agent operating directly inside the codebase.

### 6.3 Gemini (Google)
* **Operational Role:** **Deep Context Scanner & Log Analyzer**
* **Strengths:** Massive context window (up to 2M tokens), rapid processing of bulk inputs, excellent historical comparison.
* **Weaknesses:** Can prioritize context breadth over hyper-focused code execution rules.
* **Ideal Use Cases:** Ingesting full backend logs to isolate server exceptions, scanning entire database schemas (`schema.prisma`) for multi-tenant leaks, and comparative audits of historical documents.
* **Forbidden Use Cases:** Precise code edits to sensitive controllers.
* **Workflow Positioning:** Downstream diagnostic tool and full-repo auditor.

### 6.4 ChatGPT (OpenAI)
* **Operational Role:** **Ad-Hoc Scripting & Quick Reference Assistant**
* **Strengths:** Fast response latency, broad knowledge base, excellent utility script generation.
* **Weaknesses:** Lacks direct repository context; prone to hallucinating proprietary class interfaces if not explicitly supplied.
* **Ideal Use Cases:** Writing quick shell scripts, testing regular expressions, formatting JSON payloads, and generating mock data records for test suites.
* **Forbidden Use Cases:** Direct file edits to the production codebase; writing strategic charters.
* **Workflow Positioning:** Out-of-band development sandbox tool.

### 6.5 Notion AI
* **Operational Role:** **Internal Operations & Wiki Manager**
* **Strengths:** Direct integration with corporate workspaces, formatting ease, collaborative drafting.
* **Weaknesses:** Zero technical codebase context; cannot inspect code or running tasks.
* **Ideal Use Cases:** Drafting meeting minutes, formatting team onboarding manuals, updating the client contact directories, and generating initial customer outreach emails.
* **Forbidden Use Cases:** Storing API keys, server environment variables, or database schemas.
* **Workflow Positioning:** Non-technical administrative editor.

### 6.6 GitHub Copilot
* **Operational Role:** **Line-Level Autocomplete & Syntax Assistant**
* **Strengths:** Inline code-completion, syntax matching, speed.
* **Weaknesses:** Prone to recommending generic boilerplate that violates BRASA domain rules (e.g., suggesting a fail-closed check where a fail-open is mandated).
* **Ideal Use Cases:** Writing boilerplate tests, completing standard interface mappings, and accelerating typing velocity.
* **Forbidden Use Cases:** Making architectural decisions; writing complex algorithms without active supervision.
* **Workflow Positioning:** Inside-the-editor typing helper.

---

## 7. Immediate Next Steps (Next 30 Days)

1. **System Prompt Updates:** Update system prompts for Claude, Antigravity, and Gemini to include their allocated roles, strengths, and forbidden boundaries.
2. **Context Cleanup:** Prune any irrelevant, old log directories in the workspace to save token space for active subagents and development tools.
3. **Training & Onboarding:** Share this AI Segmentation map with all engineering contractors to unify development workflows.

---

## 8. Long-Term Evolution Path (12-36 Months)

- **Year 1:** Enforce this manual role separation across the development lifecycle.
- **Year 2:** Implement automated routing middleware that automatically directs user requests to the optimal AI model based on task classification.
- **Year 3:** Transition to a private, locally hosted LLM environment for processing sensitive transaction records, satisfying strict B2G government data regulations.

---

*This document is maintained by the AI Integration Team. Strategic updates require executive approval.*

*BRASA HQ — AI ROLE SEGMENTATION: Strategic Operating System Directive*
