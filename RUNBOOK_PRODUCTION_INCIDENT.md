# BRASA Meat Intelligence - SRE Production Escalation Runbook

## 📌 Contexto Estratégico
Este runbook norteia operações contingenciais puras sem execução cega de infraestrutura. A regra zero é preservar transações bancárias da Railway e impedir Drop Tables implícitos. Use as Actions de GitHub programadas para resolver anomalias operacionais.

---

## 🔍 1. MATRIZ DE DEGRADAÇÃO / SINTOMAS

| Severidade | Sintoma Diagnóstico | Análise Probabilística SRE |
|---|---|---|
| **P1** | Logs Backend acusam `PrismaMigrationGuard` System EXIT ou trava inicializadora. | Houve inserção de *Drop* na CI, ou o Rollout sofreu Crash na Migrate deixando resquício P3009. API Off. |
| **P1** | Actions: Monitor `postDeployCheck.ts` dispara Exit 1 apontado "Health Status Aberrante" | Node ou dependência da RAM parou antes do Express aceitar GET route. |
| **P2** | Actions: CI rejeitou Drift Check | Pull Request gerou Divergência sem ser documentada em Schema de SQL. |
| **P3** | Action Falha Transacional `smokeTest.ts` aponta 401 | Tokens rotacionaram na JWT / Secrets do projeto errados. |

---

## 🛡️ 2. RESPOSTAS DE ROTA SRE INCIDENTE (Zero-Trust)

### Cenario 1: Prisma "Boot Block" e Travamento P3009/P3008 no Infra
*O servidor Node aponta a variável Boot Block bloqueada e recusa inicializar as APIs da Railway.*

**Rotina Definitiva para Recuperação Manual Segura:**
1. Execute query analítico manual **(NUNCA DESTACAR DADOS / DROPS)** em sua IDE de DB remota contra a Base Oficial para aferir se as tabelas estragadas existem fisicamente.
2. Acesse GitHub Actions -> `SRE Incident Recovery Protocol` Workflow.
3. Configure:
   - Target Environment: `production`
   - Migration ID Causador: Coletado do Log
   - Target Routine SRE: `resolve_applied` (Se o seu forward-fix DB isolado funcionou).
4. Essa ação bypassará a engrenagem do rastreador FAILED Prisma e o boot subsequentemente será religado.

### Cenário 2: Quebra Sistêmica Latente E2E (Latency Threshold / Logic Crash HTTP)
*A base PGSQL está saudável, sync operante e sem histórico falho, mas chamadas HTTP e Requests internas morrem.*

**Rotina Rollback Operacional:**
1. Dispare pelo Dashboard do GitHub a GHA: `SRE Manual Rollback Procedure`.
2. Providencie um Git Hash de um código anterior operante e sólido.
3. Observe a validação SRE de Database Conformidade (Dry Run Log).
4. Procedimento físico: Aja abertamente no painel de ambiente "Production" na infra Railway do Tenant, clicando em **Redeploy** na hash aferida pela Action Audit.

---

## ⛔ 3. GOVERNANÇA SRE / POLICY DE PROIBIÇÕES ZERO

1. **NÃO HÁ REVERSÃO CEGA DE TABELAS.** Rollbacks automatizados de schema em ORMs destróem colunas sem backup por natureza. Qualquer Revert de estrutura DB será resolvido por novas migrações PR (Forward-Fix).
2. **NÃO REINICIE O MIGRATION GUARD DE PROPÓSITO.** Ele existe para matar a Aplicação no Node Container em caso de corrupção do tracking table. Um app bloqueado previne desastres bi-direcionais no banco de dados Master do SaaS.

---

## 🎯 4. CRITÉRIOS DE INCIDENT CLOSURE SRE

### 🟩 INCIDENT CLOSED
O processo SRE encontra-se selado, sem alertas falsos-positivos ativos se:
1. `postDeployCheck.ts` completar E2E via API Real com retorno transacional validando o status de mutação com limite OK.
2. Tabela Interna Prisma não possui nenhum registro sem validade `finished_at`.

### 🟨 INCIDENT PARTIALLY CLOSED
Em ambiente de sobrevivência. App online por redeploy (Railway History Injection) mas `_prisma_migrations` relata Divergência física. Exige intervenção no próximo Release Branch.

### 🟥 NOT CLOSED
Trancamento em Boot Gate ou Timeouts crônicos pós-deploy permanecem intransponíveis forçando indisponibilidade global 502/503.
