# 📚 ÍNDICE MASTER - Finance Oráculo (Para Codex)

**Última Atualização:** 2025-11-06
**Versão:** 1.0.0
**Propósito:** Guia completo para qualquer IA/desenvolvedor começar no projeto

---

## 🎯 LEIA PRIMEIRO

**Se você é uma nova IA ou desenvolvedor, COMECE POR AQUI:**

1. **Contexto Completo:** [finance-oraculo-backend/.codex/PROJECT_MEMORY.md](finance-oraculo-backend/.codex/PROJECT_MEMORY.md) (~20 min leitura)
2. **Schema do Banco:** [finance-oraculo-backend/.codex/DATABASE_SCHEMA.md](finance-oraculo-backend/.codex/DATABASE_SCHEMA.md) (~15 min leitura)
3. **Status Atual:** [finance-oraculo-backend/.codex/STATUS_FINAL_SESSAO.md](finance-oraculo-backend/.codex/STATUS_FINAL_SESSAO.md) (~5 min leitura)
4. **Problemas Pendentes:** [finance-oraculo-backend/PROBLEMAS_PENDENTES_PARA_RESOLVER.md](finance-oraculo-backend/PROBLEMAS_PENDENTES_PARA_RESOLVER.md) (~10 min leitura)

**Tempo total:** ~50 minutos para contexto completo

---

## 📂 Estrutura do Projeto

```
dashfinance/
├── finance-oraculo-backend/
│   ├── .codex/                           # 🧠 RAG MEMORY (LEIA ISTO!)
│   │   ├── PROJECT_MEMORY.md             # Contexto completo do projeto
│   │   ├── DATABASE_SCHEMA.md            # Schema PostgreSQL detalhado
│   │   ├── QUICK_START.md                # Guia início rápido
│   │   ├── README.md                     # Índice da pasta RAG
│   │   └── STATUS_FINAL_SESSAO.md        # Status final sessão 2025-11-06
│   │
│   ├── migrations/                       # SQL Migrations
│   │   ├── 001-006_*.sql                 # Migrations anteriores
│   │   ├── 007_dashboard_cards.sql       # Cards pré-calculados
│   │   └── 008_erp_sync_tables.sql       # Tabelas ERP (EXECUTADA 2025-11-06)
│   │
│   ├── n8n-workflows/                    # Workflows N8N (JSON)
│   │   ├── whatsapp-bot-v3-ultra-optimized.json
│   │   ├── dashboard-cards-processor.json
│   │   ├── erp-sync-omie-intelligent.json
│   │   └── erp-sync-f360-intelligent.json
│   │
│   ├── PARA_CODEX_FRONTEND.md            # Especificação do frontend
│   ├── STATUS_IMPORTACAO_N8N.md          # Status workflows N8N
│   ├── ATIVAR_WORKFLOWS_MANUAL.md        # Guia ativação N8N
│   ├── PROBLEMAS_PENDENTES_PARA_RESOLVER.md  # Lista de problemas
│   ├── SESSAO_2025-11-06_RESUMO.md       # Resumo sessão
│   ├── REVERTER_TUDO_PARA_EDGE_FUNCTIONS.md  # Plano B
│   ├── DASHBOARD_CARDS_QUERY_CORRIGIDA.sql   # Query corrigida
│   └── COMO_CORRIGIR_DASHBOARD_CARDS.md  # Guia correção
│
└── INDICE_MASTER_PARA_CODEX.md          # Este arquivo

```

---

## 🗄️ Base de Dados

### Conexão PostgreSQL (Supabase)

```bash
Host: db.xzrmzmcoslomtzkzgskn.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: B5b0dcf500@#

# Comando de conexão
PGPASSWORD='B5b0dcf500@#' psql \
  -h db.xzrmzmcoslomtzkzgskn.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres
```

### Tabelas Principais (20+)

**Ver detalhes completos em:** [finance-oraculo-backend/.codex/DATABASE_SCHEMA.md](finance-oraculo-backend/.codex/DATABASE_SCHEMA.md)

**Resumo:**
- `clientes` - Empresas clientes (tabela base)
- `clients` - View sobre `clientes`
- `transactions` - Transações financeiras consolidadas
- `daily_snapshots` - Snapshots diários de métricas
- `dashboard_cards` - Cards pré-calculados (5 min refresh)
- `omie_config`, `omie_invoices` - ERP OMIE
- `f360_config`, `f360_accounts` - ERP F360
- `sync_logs` - Logs de sincronização
- `conversations`, `conversation_context` - WhatsApp Bot

---

## 🤖 N8N Workflows

### Status Atual: ❌ NÃO FUNCIONAIS

**URL:** https://n8n.angrax.com.br
**API Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3OTcwYzdkMy04NmFkLTRjOGEtOGNkOS1jMDk1OTYzMjk5Y2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYyNDMzNDE4fQ.BTWCY0JgrhPhyMo_gooQqQEXHyUdDw0z8Sw5kep2Lww`

**4 Workflows Importados:**
1. WhatsApp Bot v3 (ID: `im1AEcSXG6tqPJtj`)
2. Dashboard Cards (ID: `pr1gms7avsjcmqd1`)
3. ERP Sync OMIE (ID: `OZODoO73LbcKJKHU`)
4. ERP Sync F360 (ID: `08O0Cx6ixhdN7JXD`)

**Problema:** Todos com erro "Lost connection to the server"

**Decisão Pendente:** Manter ou abandonar N8N?

---

## ☁️ Supabase Edge Functions

### Status Atual: ✅ FUNCIONANDO

**Base URL:** `https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1`

**Edge Functions Existentes:**
1. `sync-f360` - ERP Sync F360
2. `sync-omie` - ERP Sync OMIE
3. `whatsapp-bot` - WhatsApp Bot
4. `analyze` - Análises IA
5. `export-excel` - Exportar Excel
6. `upload-dre` - Upload DRE
7. `send-scheduled-messages` - Mensagens agendadas
8. `admin-users`, `admin-llm-config`, `admin-security-dashboard` - Admin
9. `replicate_clientes`, `replicateclientes` - Replicação

**Observação:** Syncs parecem parados desde janeiro 2025 (investigar)

---

## 🔑 Credenciais e Acessos

### Supabase
```
URL: https://xzrmzmcoslomtzkzgskn.supabase.co
Database Password: B5b0dcf500@#
```

### N8N
```
URL: https://n8n.angrax.com.br
Credencial PostgreSQL: "Supabase PostgreSQL Finance" (ID: eWdwRJii0F6jKHdU)
  - Ignore SSL Issues: ON (obrigatório)
```

### APIs Externas
- Evolution API (WhatsApp)
- OMIE ERP
- F360 ERP
- OpenAI/Anthropic (LLM)

---

## ⚠️ Problemas Conhecidos

### 1. N8N Workflows Não Funcionam
**Erro:** "Lost connection to the server"
**Status:** Não resolvido
**Ver:** [PROBLEMAS_PENDENTES_PARA_RESOLVER.md](finance-oraculo-backend/PROBLEMAS_PENDENTES_PARA_RESOLVER.md)

### 2. CNPJs Vazios na Tabela `clientes`
**Problema:** 10 empresas ativas sem CNPJ válido
**Impacto:** Queries com JOIN por CNPJ falham

### 3. Tabelas Vazias (Sem Dados)
**Tabelas:** `transactions`, `omie_config`, `f360_config`, `daily_snapshots`
**Impacto:** Impossível testar workflows

### 4. Syncs Parados Desde Janeiro
**Última sync:** 05/01/2025
**Empresas afetadas:** Matrix, Logimax, Atlas
**Causa:** Desconhecida (investigar)

---

## 🎯 Tarefas Prioritárias

### 🔴 Alta Prioridade

1. **DECIDIR:** Manter N8N ou abandonar?
2. **INVESTIGAR:** Por que syncs OMIE/F360 pararam?
3. **POPULAR:** CNPJs faltantes nas empresas ativas

### 🟡 Média Prioridade

4. **TESTAR:** Edge Functions existentes funcionam?
5. **CONFIGURAR:** Cron jobs no Supabase para syncs
6. **CRIAR:** Dados de teste para validação

### 🟢 Baixa Prioridade

7. **OTIMIZAR:** Dashboard Cards (se manter N8N)
8. **MONITORAR:** Custos e performance
9. **DOCUMENTAR:** Processo de deploy

---

## 💰 Custos e Economia

**Objetivo Original:** Reduzir $75/mês → $4.50/mês (94% economia)

**Status Atual:**
- Edge Functions: $75/mês (como antes)
- N8N: Não funcional, economia = $0

**Decisão afeta:**
- N8N funcional: ~$68.50/mês economia
- Só Edge Functions: $0 economia, 100% estabilidade

---

## 📖 Guias de Leitura por Cenário

### Cenário 1: Você vai CORRIGIR N8N
**Leia nesta ordem:**
1. [PROJECT_MEMORY.md](finance-oraculo-backend/.codex/PROJECT_MEMORY.md) - Seção "N8N Workflows"
2. [PROBLEMAS_PENDENTES_PARA_RESOLVER.md](finance-oraculo-backend/PROBLEMAS_PENDENTES_PARA_RESOLVER.md) - Problema #1
3. [STATUS_IMPORTACAO_N8N.md](finance-oraculo-backend/STATUS_IMPORTACAO_N8N.md)
4. Investigar logs do N8N na VPS

### Cenário 2: Você vai ABANDONAR N8N
**Leia nesta ordem:**
1. [REVERTER_TUDO_PARA_EDGE_FUNCTIONS.md](finance-oraculo-backend/REVERTER_TUDO_PARA_EDGE_FUNCTIONS.md)
2. Verificar Edge Functions no Supabase
3. Configurar Cron jobs

### Cenário 3: Você vai TRABALHAR NO FRONTEND
**Leia nesta ordem:**
1. [PARA_CODEX_FRONTEND.md](finance-oraculo-backend/PARA_CODEX_FRONTEND.md)
2. [DATABASE_SCHEMA.md](finance-oraculo-backend/.codex/DATABASE_SCHEMA.md) - Views importantes
3. Verificar Edge Functions disponíveis

### Cenário 4: Você vai INVESTIGAR SYNCS PARADOS
**Leia nesta ordem:**
1. [PROJECT_MEMORY.md](finance-oraculo-backend/.codex/PROJECT_MEMORY.md) - Seção "Integrações Externas"
2. Verificar logs Edge Functions `sync-omie` e `sync-f360`
3. Testar credenciais OMIE/F360 das empresas

---

## 🔍 Queries Úteis

### Verificar Empresas Ativas
```sql
SELECT cnpj, razao_social, status
FROM clientes
WHERE status = 'Ativo'
ORDER BY razao_social;
```

### Verificar Tabelas Existentes
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Verificar Últimas Syncs
```sql
SELECT provider, company_cnpj, status, synced_at
FROM sync_logs
ORDER BY synced_at DESC
LIMIT 20;
```

### Verificar Dashboard Cards
```sql
SELECT card_type, calculated_at, expires_at
FROM dashboard_cards
WHERE expires_at > NOW()
ORDER BY card_type;
```

---

## 🚀 Como Começar (Checklist)

- [ ] Ler PROJECT_MEMORY.md (~20 min)
- [ ] Ler DATABASE_SCHEMA.md (~15 min)
- [ ] Ler STATUS_FINAL_SESSAO.md (~5 min)
- [ ] Ler PROBLEMAS_PENDENTES_PARA_RESOLVER.md (~10 min)
- [ ] Conectar ao PostgreSQL e verificar tabelas
- [ ] Decidir: N8N sim ou não?
- [ ] Executar próximos passos conforme decisão

---

## 📞 Contatos e Recursos

**Documentação:**
- Supabase: https://supabase.com/docs
- N8N: https://docs.n8n.io
- PostgreSQL: https://www.postgresql.org/docs

**Projeto:**
- Backend: `/Users/alceualvespasssosmac/dashfinance/finance-oraculo-backend`
- N8N: https://n8n.angrax.com.br
- Supabase: https://xzrmzmcoslomtzkzgskn.supabase.co

---

## 🎓 Conceitos Importantes

**RAG (Retrieval-Augmented Generation):**
Esta pasta `.codex/` contém memória persistente para IAs. Sempre ler antes de começar qualquer tarefa.

**Edge Functions vs N8N:**
- Edge Functions: TypeScript, controle total, já funcionando
- N8N: Visual, no-code, mas com problemas de conexão

**Migrations:**
Sempre executar em ordem. Última: 008 (executada 2025-11-06).

**RLS (Row Level Security):**
Supabase usa RLS. Queries precisam respeitar políticas de acesso.

---

**Última atualização:** 2025-11-06 por Claude (Sessão de migração N8N)
**Próxima atualização:** Após decisão sobre N8N

---

**BOA SORTE! 🚀**

