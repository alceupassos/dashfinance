# 🔧 Problemas Pendentes - Finance Oráculo

**Data:** 2025-11-06
**Para:** Resolver com próximo Codex

---

## 🎯 Problemas Identificados Hoje

### 1. ❌ N8N Workflows com Erro "Lost connection to the server"

**Status:** 4 workflows importados mas não funcionam

**Workflows afetados:**
- Dashboard Cards Pre-Processor (ID: `pr1gms7avsjcmqd1`)
- ERP Sync - OMIE Intelligent (ID: `OZODoO73LbcKJKHU`)
- ERP Sync - F360 Intelligent (ID: `08O0Cx6ixhdN7JXD`)
- WhatsApp Bot v3 (ID: `im1AEcSXG6tqPJtj`)

**Sintomas:**
- Credencial PostgreSQL conecta OK (verde)
- Primeiro nó executa OK (verde)
- Segundo nó (query complexa) dá "Lost connection to the server"
- Erro persiste mesmo após reload/reativação

**Possíveis causas:**
1. Query muito complexa causa timeout
2. Cross joins com tabelas vazias causam problema
3. N8N na VPS com problema de memória/firewall
4. Versão do N8N incompatível

**Tentativas já feitas:**
- ✅ Corrigido nomes de colunas (`available_balance` → `available_for_payments`)
- ✅ Corrigido nomes de tabelas (`clients` → `clientes`)
- ✅ Corrigido valores de status (`'active'` → `'Ativo'`)
- ✅ Credencial PostgreSQL com "Ignore SSL Issues" ON
- ✅ Query simplificada (removido nested aggregates)
- ❌ Ainda não funciona

**Decisão pendente:**
- Manter N8N e resolver erro? OU
- Abandonar N8N e usar só Edge Functions? OU
- N8N só para chamar Edge Functions (sem queries SQL)?

---

### 2. ⚠️ Tabela `clientes` com CNPJs Vazios

**Problema:** 10 empresas com `status = 'Ativo'` mas campo `cnpj` está vazio

**Impacto:**
- Workflows não conseguem fazer JOIN por CNPJ
- Edge Functions podem falhar ao buscar dados por CNPJ
- Relatórios e dashboards podem não funcionar

**Query para verificar:**
```sql
SELECT cnpj, razao_social, status
FROM clientes
WHERE status = 'Ativo' AND (cnpj IS NULL OR cnpj = '');
```

**Solução necessária:**
1. Popular CNPJs das empresas ativas OU
2. Ajustar queries para usar outro campo (id?) OU
3. Marcar empresas sem CNPJ como inativas

---

### 3. ⚠️ Tabelas Vazias (Sem Dados de Teste)

**Tabelas críticas sem dados:**
- `transactions` - Vazia (necessária para Dashboard Cards)
- `omie_config` - Vazia (necessária para ERP Sync OMIE)
- `f360_config` - Vazia (necessária para ERP Sync F360)
- `daily_snapshots` - Vazia (necessária para Dashboard Cards)

**Impacto:**
- Workflows não podem ser testados
- Dashboard Cards não calcula nada
- Edge Functions podem ter lógica não validada

**Solução necessária:**
1. Criar script para inserir dados de teste OU
2. Configurar integrações reais (OMIE/F360) para popular dados OU
3. Aceitar que não há como testar sem dados reais

---

### 4. 📊 Dashboard Cards - Query Muito Complexa

**Problema:** Query com 130 linhas, 6 CTEs, cross joins

**Arquivo:** `DASHBOARD_CARDS_QUERY_CORRIGIDA.sql`

**Complexidade:**
- 6 CTEs (Common Table Expressions)
- Joins entre: daily_snapshots, v_kpi_monthly_enriched, omie_invoices, transactions
- Aggregates: json_agg, SUM, COUNT, etc
- 12 cards diferentes calculados em uma única query

**Resultado:** Timeout no N8N

**Soluções possíveis:**
1. Simplificar query (calcular menos cards por vez)
2. Usar Edge Function ao invés de N8N
3. Pre-calcular cards em tabela separada (já existe: `dashboard_cards`)
4. Dividir em múltiplos workflows menores

**Recomendação:** Manter como Edge Function (já existe: `sync-f360`, `sync-omie`)

---

### 5. 🔐 Senhas e Credenciais

**Situação atual:**
- Senha PostgreSQL Supabase: `B5b0dcf500@#` ✅ Funcionando
- Senha VPS: Mudada recentemente (não afeta Supabase)
- N8N credencial: Configurada corretamente ✅

**Problema potencial:**
- Se senha do Supabase mudar, precisa atualizar em:
  - N8N credenciais
  - Edge Functions (variável DATABASE_URL)
  - Aplicações locais

**Ação preventiva:** Documentar onde a senha está configurada

---

### 6. 📅 Syncs Antigos (Última Sync: Janeiro 2025)

**Observado nas screenshots:**
- Matrix Consultoria LTDA: Última sync 05/01/2025 19:40
- Logimax Serviços: Última sync 05/01/2025 16:00
- Atlas Comércio: Última sync 04/01/2025 14:30 (Inativa)

**Problema:** Syncs estão paradas há meses (estamos em novembro)

**Possíveis causas:**
1. Cron jobs do Supabase desativados/não configurados
2. Edge Functions com erro
3. Credenciais OMIE/F360 inválidas
4. Empresas desativaram integração

**Ação necessária:**
1. Verificar logs das Edge Functions `sync-omie` e `sync-f360`
2. Verificar se Cron jobs estão configurados no Supabase
3. Testar manualmente as Edge Functions
4. Verificar credenciais OMIE/F360 das empresas

---

## 🎯 Prioridades Sugeridas

### 🔴 Alta Prioridade

**1. Decidir sobre N8N**
- [ ] Manter e resolver? OU
- [ ] Abandonar completamente? OU
- [ ] Usar só como scheduler (chamar Edge Functions)?

**2. Verificar Edge Functions existentes**
- [ ] Testar `sync-omie` manualmente
- [ ] Testar `sync-f360` manualmente
- [ ] Verificar logs de erro
- [ ] Confirmar que estão deployadas corretamente

**3. Popular CNPJs faltantes**
- [ ] Identificar empresas ativas sem CNPJ
- [ ] Adicionar CNPJs válidos OU marcar como inativas

### 🟡 Média Prioridade

**4. Configurar Cron Jobs no Supabase**
- [ ] Verificar se existem
- [ ] Configurar para chamar sync-omie (a cada 15 min)
- [ ] Configurar para chamar sync-f360 (a cada 15 min)

**5. Dados de Teste**
- [ ] Criar script para inserir dados fictícios
- [ ] Popular `transactions`, `omie_config`, `f360_config`
- [ ] Ou aceitar que precisa de dados reais

### 🟢 Baixa Prioridade

**6. Melhorar Documentação**
- [x] RAG Memory criada (`.codex/`)
- [ ] Atualizar com decisão final sobre N8N
- [ ] Documentar processo de deploy

**7. Otimizações Futuras**
- [ ] Quando tiver dados reais, reavaliar N8N
- [ ] Implementar cache para dashboard cards
- [ ] Monitoramento e alertas

---

## 📋 Checklist para Próxima Sessão

**Antes de começar:**
- [ ] Ler `.codex/PROJECT_MEMORY.md`
- [ ] Ler este arquivo (`PROBLEMAS_PENDENTES_PARA_RESOLVER.md`)
- [ ] Decidir: manter ou abandonar N8N?

**Se manter N8N:**
- [ ] Investigar logs do N8N na VPS
- [ ] Testar workflows mais simples
- [ ] Considerar N8N só como scheduler

**Se abandonar N8N:**
- [ ] Deletar 4 workflows
- [ ] Confirmar Edge Functions funcionando
- [ ] Configurar Cron jobs no Supabase

**Em qualquer caso:**
- [ ] Verificar syncs OMIE/F360 (por que estão paradas?)
- [ ] Popular CNPJs faltantes
- [ ] Testar Edge Functions existentes

---

## 💰 Status da Economia de Custos

**Objetivo original:** Reduzir $75/mês → $4.50/mês (94% economia)

**Status atual:**
- ❌ N8N workflows não funcionam
- ✅ Edge Functions existem e (presumivelmente) funcionam
- ⏸️ Economia = $0 (ainda usando só Edge Functions)

**Próxima decisão afeta:**
- Se N8N funcionar: ~$68.50/mês economia
- Se manter Edge Functions: $0 economia, mas 100% funcional

---

## 🔗 Arquivos Relacionados

- `.codex/PROJECT_MEMORY.md` - Contexto completo do projeto
- `.codex/DATABASE_SCHEMA.md` - Schema do banco
- `STATUS_IMPORTACAO_N8N.md` - Status dos workflows
- `REVERTER_TUDO_PARA_EDGE_FUNCTIONS.md` - Plano B
- `DASHBOARD_CARDS_QUERY_CORRIGIDA.sql` - Query corrigida (mas não funciona no N8N)
- `migrations/008_erp_sync_tables.sql` - Tabelas criadas hoje

---

**Resumo:**
- ✅ Infraestrutura está pronta (tabelas, Edge Functions)
- ❌ N8N não funciona (erro de conexão/timeout)
- ⚠️ Dados de teste ausentes
- 🎯 Decisão necessária: N8N sim ou não?

---

**Fim do documento de problemas pendentes.**
