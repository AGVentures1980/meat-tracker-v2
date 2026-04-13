# 🛑 Brasa SRE Manual: Prisma Migration Drift Recovery

Este documento estabelece o protocolo de resposta manual de Engenheiros de Confiabilidade (SRE) quando o Guardião de Inicialização (*runMigrationGuard*) interceptar corrupção no banco e bloquear o Deploy de Produção (Eventos `P3009` e `P3008`).

Com a remoção das rotinas de **Auto-Healing**, todo banco corrompido exige intervenção humada explícita.

## 1. Identificando o Incidente
O bot do CI/CD falhará ou a Railway prenderá o Container em Loop (Crash Loop).
Nos logs do servidor (`railway logs`), procure pelo evento FATAL no Boot:

```log
🚨 [SRE BLOCK] 20260218201610_add_store_templates is in BLOCK_BOOT criteria.
GUARD_SUMMARY
BLOCK_BOOT
```

## 2. Investigando o Erro
Utilize a ferramenta read-only oficial para inspecionar os danos de fora do Container (conectado na Vpn/Proxy):

```bash
DATABASE_URL="postgres://..." npx ts-node src/scripts/sre_migration_audit.ts
DATABASE_URL="postgres://..." npx ts-node src/scripts/sre_migration_compare.ts
```
Analise o resultado. Ele indicará `IN_PROGRESS`, `ROLLED_BACK`, ou `CORRUPTED`.

## 3. Resolvendo "IN_PROGRESS" Fantasma (P3009)
Se a migration travou por timeout ou queda de internet durante a aplicação real no Banco de Dados:
Acesse o console shell (ou execute via Github Actions Dispatch) o comando explícito nativo do Prisma de remediação atestando que a alteração já havia sido aplicada (Applied) ou desfeita (Rolled back).

```bash
# Se o DBA confirmar que a tabela EXISTE:
DATABASE_URL="postgres://..." npx prisma migrate resolve --applied "20260218201610_add_store_templates"

# Se o DBA confirmar que a tabela NAO EXISTE:
DATABASE_URL="postgres://..." npx prisma migrate resolve --rolled-back "20260218201610_add_store_templates"
```

## 4. Resolving Checksum Mismatch (P3004)
Se o SHA256 do arquivo SQL foi alterado *depois* da migration já ter sido aplicada ao banco:
- O Guardião (`runMigrationGuard`) pode barrar via flag `STRICT_CHECKSUM`. 
- Repare o checksum do lado da aplicação recriando os arquivos antigos sem alterar nomes, ou utilize ferramentas do Prisma para refazer o baseline.

## 5. Validación do Sistema
Após o "resolve", execute novamente o `sre_migration_audit.ts`. O status deve brilhar verde `SAFE: 1`. 
Acione um Restart Manual (`deploy`). O guardião verá State `SAFE` e liberará o servidor para servir requisições. 

> [!WARNING]
> Nunca adicione scripts como `resolveAllMigrations` (Auto-Healing) no boot assíncrono. Isso mascara falhas e destrói o banco ao empurrar bypass para logs inoperáveis. Aceite o Down-time de 2 min até a intervenção.
