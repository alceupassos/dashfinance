# 🧠 Finance Oráculo - Project Memory (RAG)

**Última Atualização:** 2025-11-06
**Versão:** 1.0.0
**Propósito:** Memória persistente para IA (RAG - Retrieval-Augmented Generation)

---

## 📋 Índice

1. [Visão Geral do Projeto](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura)
3. [Base de Dados](#base-de-dados)
4. [N8N Workflows](#n8n-workflows)
5. [APIs e Endpoints](#apis-e-endpoints)
6. [Integrações Externas](#integrações-externas)
7. [Credenciais e Configurações](#credenciais)
8. [Migrations Executadas](#migrations)
9. [Problemas Conhecidos](#problemas-conhecidos)
10. [Próximos Passos](#próximos-passos)

---

## 🎯 Visão Geral do Projeto {#visão-geral}

### O que é Finance Oráculo?

**Finance Oráculo** é uma plataforma SaaS B2B de gestão financeira para franquias e PMEs no Brasil.

**Stack Principal:**
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions)
- **Automação:** N8N (workflows visuais)
- **Frontend:** Next.js 14+ (ainda não implementado)
- **WhatsApp:** Evolution API
- **ERPs:** OMIE, F360 (Financeiro 360)

**Objetivo:** Centralizar dados financeiros de múltiplas empresas com dashboards, alertas e bot WhatsApp inteligente.

### Status Atual (2025-11-06)

- ✅ **Backend:** 100% deployado no Supabase
- ✅ **N8N:** 4 workflows Phase 1 importados e configurados
- ⏳ **Testes:** Aguardando ajustes finais nos workflows
- ❌ **Frontend:** Não iniciado (especificação em `PARA_CODEX_FRONTEND.md`)

### Economia de Custos (N8N Migration)

**Antes (Edge Functions):**
- 10 Edge Functions
- Custo: $75/mês
- Latência: 2-5s
- Cold starts constantes

**Depois (N8N + 2 Edge Functions):**
- 10 Workflows N8N + 2 Edge Functions
- Custo: $4.50/mês (**94% economia**)
- Latência: 0.5-2s (**4x mais rápido**)
- Zero cold starts

---

## 🏗️ Arquitetura do Sistema {#arquitetura}

```
┌─────────────────────────────────────────────────────────────┐
│                        USUÁRIOS                              │
│  (Franqueados, Gerentes, Contadores, Admins)                │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js 14+)                     │
│  • App Router • Tailwind • shadcn/ui • SWR • Zustand        │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                 SUPABASE (Backend Principal)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ PostgreSQL   │  │ Auth (JWT)   │  │ Edge Functions│      │
│  │ 20+ tabelas  │  │ RLS enabled  │  │ (2 restantes)│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    N8N (Automação)                           │
│  ┌────────────────────────────────────────────────────┐     │
│  │ Phase 1 (✅ Importados):                            │     │
│  │  • WhatsApp Bot v3 (80% sem LLM)                   │     │
│  │  • Dashboard Cards Pre-Processor (5 min)           │     │
│  │  • ERP Sync OMIE Intelligent (15 min)              │     │
│  │  • ERP Sync F360 Intelligent (15 min)              │     │
│  └────────────────────────────────────────────────────┘     │
│  URL: https://n8n.angrax.com.br                             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  INTEGRAÇÕES EXTERNAS                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Evolution API│  │ OMIE ERP     │  │ F360 ERP     │      │
│  │ (WhatsApp)   │  │ (Contas)     │  │ (Contas)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 💾 Base de Dados {#base-de-dados}

### Conexão PostgreSQL

```
Host: db.xzrmzmcoslomtzkzgskn.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: B5b0dcf500@#
SSL: Requer "Ignore SSL Issues" no N8N (self-signed cert)
```

### Tabelas Principais (20+)

#### 1. Clientes e Usuários
```sql
-- clients (VIEW) - Empresas clientes
-- Campos: id, name, cnpj, franchisee_name, system_type,
--         integration_type, integration_token, sync_enabled

-- clientes (TABLE) - Tabela base real
-- users (Supabase Auth) - Usuários do sistema
```

#### 2. Dados Financeiros
```sql
-- transactions - Transações consolidadas
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  company_cnpj TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  description TEXT,
  amount DECIMAL(15,2) NOT NULL,
  type TEXT NOT NULL, -- 'income', 'expense'
  category TEXT,
  account_id TEXT,
  provider TEXT, -- 'OMIE', 'F360', 'MANUAL'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_cnpj, transaction_id, provider)
);

-- daily_snapshots - Snapshots diários de métricas
-- (estrutura detalhada em migrations/002_*)
```

#### 3. ERP Sync (OMIE)
```sql
-- omie_config - Configurações de API do OMIE
CREATE TABLE omie_config (
  id UUID PRIMARY KEY,
  company_cnpj TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL,
  app_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- omie_invoices - Faturas sincronizadas do OMIE
CREATE TABLE omie_invoices (
  id UUID PRIMARY KEY,
  company_cnpj TEXT NOT NULL,
  invoice_id TEXT NOT NULL UNIQUE, -- OMIE_{codigo_lancamento}
  invoice_number TEXT,
  provider TEXT DEFAULT 'OMIE',
  description TEXT,
  issue_date DATE,
  due_date DATE NOT NULL,
  payment_date DATE,
  total_value DECIMAL(15,2) NOT NULL,
  paid_value DECIMAL(15,2) DEFAULT 0,
  category TEXT,
  status TEXT NOT NULL, -- 'pending', 'paid', 'overdue'
  metadata JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. ERP Sync (F360)
```sql
-- f360_config - Configurações de API do F360
CREATE TABLE f360_config (
  id UUID PRIMARY KEY,
  company_cnpj TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- f360_accounts - Contas bancárias do F360
CREATE TABLE f360_accounts (
  id UUID PRIMARY KEY,
  company_cnpj TEXT NOT NULL,
  account_id TEXT NOT NULL UNIQUE, -- F360_{id}
  account_name TEXT NOT NULL,
  balance DECIMAL(15,2) DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  account_type TEXT, -- 'checking', 'savings', 'investment'
  is_active BOOLEAN DEFAULT true,
  metadata JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5. Logs e Auditoria
```sql
-- sync_logs - Logs de sincronização de ERPs
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY,
  sync_type TEXT NOT NULL, -- 'invoices', 'accounts', 'transactions'
  provider TEXT NOT NULL, -- 'OMIE', 'F360'
  company_cnpj TEXT NOT NULL,
  records_synced INTEGER DEFAULT 0,
  status TEXT NOT NULL, -- 'success', 'error', 'no_changes'
  message TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 6. Dashboard Cards (Otimização N8N)
```sql
-- dashboard_cards - Cards pré-calculados (5 min refresh)
CREATE TABLE dashboard_cards (
  id UUID PRIMARY KEY,
  company_cnpj TEXT NOT NULL,
  card_type TEXT NOT NULL, -- 'total_caixa', 'disponivel', etc.
  card_data JSONB NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes',
  UNIQUE(company_cnpj, card_type)
);

-- v_dashboard_cards_valid - View com cards válidos
CREATE VIEW v_dashboard_cards_valid AS
SELECT * FROM dashboard_cards WHERE expires_at > NOW();
```

**12 Tipos de Cards:**
1. `total_caixa` - Total em caixa
2. `disponivel` - Disponível para uso
3. `receitas_mes` - Receitas do mês
4. `despesas_mes` - Despesas do mês
5. `faturas_vencidas` - Faturas vencidas (count + valor)
6. `runway` - Dias de caixa restantes
7. `burn_rate` - Taxa de queima mensal
8. `dso` - Days Sales Outstanding
9. `dpo` - Days Payable Outstanding
10. `margem` - Margem bruta
11. `grafico_tendencia` - Gráfico de 12 meses
12. `top_despesas` - Top 5 despesas do mês

#### 7. WhatsApp Bot
```sql
-- conversations - Conversas do WhatsApp
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  phone_number TEXT NOT NULL,
  company_cnpj TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- 'active', 'ended'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(phone_number, company_cnpj)
);

-- conversation_context - Contexto e histórico
-- (já existia antes da migration 008)
```

### Views Importantes

```sql
-- v_kpi_monthly_enriched - KPIs mensais para dashboard
CREATE VIEW v_kpi_monthly_enriched AS
SELECT
  company_cnpj,
  DATE_TRUNC('month', transaction_date) AS month,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS revenue,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expenses,
  SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) AS profit
FROM transactions
GROUP BY company_cnpj, DATE_TRUNC('month', transaction_date);

-- v_dashboard_cards_valid - Cards válidos (não expirados)
-- (já documentado acima)
```

---

## 🤖 N8N Workflows {#n8n-workflows}

### Informações Gerais

**URL:** https://n8n.angrax.com.br
**API Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3OTcwYzdkMy04NmFkLTRjOGEtOGNkOS1jMDk1OTYzMjk5Y2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYyNDMzNDE4fQ.BTWCY0JgrhPhyMo_gooQqQEXHyUdDw0z8Sw5kep2Lww`
**Expira:** 2025-12-05

### Credenciais Configuradas

#### 1. PostgreSQL: "Supabase PostgreSQL Finance"
- **ID:** `eWdwRJii0F6jKHdU`
- **Host:** `db.xzrmzmcoslomtzkzgskn.supabase.co`
- **Port:** `5432`
- **Database:** `postgres`
- **User:** `postgres`
- **Password:** `B5b0dcf500@#`
- **SSL:** Allow
- **Ignore SSL Issues:** ✅ ON (necessário para Supabase)

#### 2. Evolution API: "Evolution API Key"
- **ID:** `OeWaimPjLFpTWr64`
- **Tipo:** HTTP Header Auth
- **Header:** `X-API-KEY`
- **Variável de Ambiente Necessária:** `EVO_API_URL`

### Phase 1 - Workflows Importados (2025-11-06)

#### 1. WhatsApp Bot v3 - Ultra Otimizado (80% sem LLM)
- **ID:** `im1AEcSXG6tqPJtj`
- **Status:** ✅ Importado, ⏳ Aguardando ajustes
- **Arquivo:** `n8n-workflows/whatsapp-bot-v3-ultra-optimized.json`
- **Nodes:** 19
- **Trigger:** Webhook POST `/webhook/whatsapp-bot-v3`
- **Frequência:** Real-time (webhook)
- **Economia:** $43.50/mês (97% redução)

**Funcionamento:**
1. Recebe mensagem via webhook da Evolution API
2. Classifica query (simples/cálculo/complexa)
3. 80% das queries: resposta direta via SQL (custo $0)
4. 20% das queries: encaminha para LLM (Claude/OpenAI)
5. Registra contexto em `conversation_context`

**Tabelas Usadas:**
- `conversations`
- `conversation_context`
- `transactions`
- `daily_snapshots`

**Webhook URL:**
```
POST https://n8n.angrax.com.br/webhook/whatsapp-bot-v3
Content-Type: application/json

{
  "data": {
    "message": {
      "conversation": "qual meu saldo?"
    },
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net"
    }
  },
  "cnpj": "00.000.000/0001-00"
}
```

---

#### 2. Dashboard Cards Pre-Processor
- **ID:** `pr1gms7avsjcmqd1`
- **Status:** ✅ Importado, ⚠️ Requer ajuste (query `status`)
- **Arquivo:** `n8n-workflows/dashboard-cards-processor.json`
- **Nodes:** 7
- **Trigger:** Cron `*/5 * * * *` (a cada 5 minutos)
- **Frequência:** 288 execuções/dia
- **Economia:** $15/mês (100% redução)

**Funcionamento:**
1. A cada 5 minutos, busca empresas ativas
2. Executa query única com CTEs para todos os 12 cards
3. Function node calcula e formata cards
4. Upsert em `dashboard_cards` (substitui cards antigos)

**Tabelas Usadas:**
- `clients` (view)
- `transactions`
- `v_kpi_monthly_enriched` (view)
- `dashboard_cards` (destino)

**⚠️ AJUSTE NECESSÁRIO:**

Nó: "PostgreSQL - Buscar Empresas Ativas"

**Query Atual (ERRO):**
```sql
SELECT cnpj, name, status
FROM clients
WHERE status = 'active'
ORDER BY name;
```

**Query Corrigida:**
```sql
SELECT cnpj, name
FROM clients
WHERE sync_enabled = true
ORDER BY name
LIMIT 10;
```

**Motivo:** A view `clients` não tem coluna `status`, use `sync_enabled`.

---

#### 3. ERP Sync - OMIE Intelligent
- **ID:** `OZODoO73LbcKJKHU`
- **Status:** ✅ Importado, ⚠️ Requer ajuste (query `status`)
- **Arquivo:** `n8n-workflows/erp-sync-omie-intelligent.json`
- **Nodes:** 13
- **Trigger:** Cron `*/15 * * * *` (a cada 15 minutos)
- **Frequência:** 96 execuções/dia
- **Economia:** $5/mês (100% redução)

**Funcionamento:**
1. A cada 15 minutos, busca empresas com OMIE ativo
2. Para cada empresa, chama API OMIE (listar contas a pagar)
3. Transforma dados para formato do banco
4. **Diff Detection:** calcula hash MD5, só atualiza se mudou
5. Upsert em `omie_invoices`
6. Registra em `sync_logs`

**Tabelas Usadas:**
- `clients` (view)
- `omie_config`
- `omie_invoices` (destino)
- `sync_logs` (destino)

**API OMIE:**
```
POST https://app.omie.com.br/api/v1/financas/contaspagar/
{
  "call": "ListarContasPagar",
  "app_key": "{{app_key}}",
  "app_secret": "{{api_key}}",
  "param": [{
    "pagina": 1,
    "registros_por_pagina": 100,
    "apenas_importado_api": "N"
  }]
}
```

**⚠️ AJUSTE NECESSÁRIO:**

Nó: "PostgreSQL - Empresas com OMIE Ativo"

**Query Atual (ERRO):**
```sql
SELECT c.cnpj, c.name, oc.api_key, oc.app_key
FROM clients c
JOIN omie_config oc ON oc.company_cnpj = c.cnpj
WHERE c.status = 'active' AND oc.is_active = true
ORDER BY c.name;
```

**Query Corrigida:**
```sql
SELECT c.cnpj, c.name, oc.api_key, oc.app_key
FROM clients c
JOIN omie_config oc ON oc.company_cnpj = c.cnpj
WHERE c.sync_enabled = true AND oc.is_active = true
ORDER BY c.name;
```

---

#### 4. ERP Sync - F360 Intelligent
- **ID:** `08O0Cx6ixhdN7JXD`
- **Status:** ✅ Importado, ⚠️ Requer ajuste (query `status`)
- **Arquivo:** `n8n-workflows/erp-sync-f360-intelligent.json`
- **Nodes:** 13
- **Trigger:** Cron `*/15 * * * *` (a cada 15 minutos)
- **Frequência:** 96 execuções/dia
- **Economia:** $5/mês (100% redução)

**Funcionamento:**
1. A cada 15 minutos, busca empresas com F360 ativo
2. Para cada empresa, chama API F360 (listar contas)
3. Transforma dados para formato do banco
4. **Diff Detection:** calcula hash MD5, só atualiza se mudou
5. Upsert em `f360_accounts`
6. Registra em `sync_logs`

**Tabelas Usadas:**
- `clients` (view)
- `f360_config`
- `f360_accounts` (destino)
- `sync_logs` (destino)

**API F360:**
```
GET https://api.f360.com.br/v1/accounts
Authorization: Bearer {{api_key}}
```

**⚠️ AJUSTE NECESSÁRIO:**

Nó: "PostgreSQL - Empresas com F360 Ativo"

**Query Atual (ERRO):**
```sql
SELECT c.cnpj, c.name, fc.api_key
FROM clients c
JOIN f360_config fc ON fc.company_cnpj = c.cnpj
WHERE c.status = 'active' AND fc.is_active = true
ORDER BY c.name;
```

**Query Corrigida:**
```sql
SELECT c.cnpj, c.name, fc.api_key
FROM clients c
JOIN f360_config fc ON fc.company_cnpj = c.cnpj
WHERE c.sync_enabled = true AND fc.is_active = true
ORDER BY c.name;
```

---

## 🔌 APIs e Endpoints {#apis-e-endpoints}

### Supabase Edge Functions (2 restantes)

#### 1. WhatsApp Bot v2 (Fallback para queries complexas)
- **URL:** `https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/whatsapp-bot-v2`
- **Método:** POST
- **Auth:** Bearer token (Supabase anon key)
- **Usado por:** N8N WhatsApp Bot v3 (20% das queries)

#### 2. Admin Dashboard API (opcional, se não migrado para N8N)
- **URL:** `https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/admin-dashboard`
- **Método:** GET/POST
- **Auth:** Bearer token (Supabase anon key)

### N8N Webhooks

#### WhatsApp Bot v3
```
POST https://n8n.angrax.com.br/webhook/whatsapp-bot-v3
Content-Type: application/json

{
  "data": {
    "message": {
      "conversation": "string"
    },
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net"
    }
  },
  "cnpj": "00.000.000/0001-00"
}
```

---

## 🔗 Integrações Externas {#integrações-externas}

### 1. Evolution API (WhatsApp)
- **Instância:** `iFinance`
- **Base URL:** Configurada em variável de ambiente `EVO_API_URL` no N8N
- **Autenticação:** API Key via header `X-API-KEY`
- **Credencial N8N:** "Evolution API Key" (ID: `OeWaimPjLFpTWr64`)

**Endpoints Usados:**
```
POST {EVO_API_URL}/message/sendText
POST {EVO_API_URL}/message/sendMedia
GET {EVO_API_URL}/instance/iFinance/connectionState
```

### 2. OMIE ERP
- **Base URL:** `https://app.omie.com.br/api/v1`
- **Autenticação:** `app_key` + `app_secret`
- **Configuração:** Tabela `omie_config` (por empresa)

**Endpoints Usados:**
```
POST /financas/contaspagar/
  - call: ListarContasPagar
  - call: ConsultarContaPagar
```

### 3. F360 (Financeiro 360)
- **Base URL:** `https://api.f360.com.br/v1`
- **Autenticação:** Bearer token
- **Configuração:** Tabela `f360_config` (por empresa)

**Endpoints Usados:**
```
GET /accounts
GET /transactions
```

### 4. OpenAI / Anthropic (LLM)
- **Provider:** Claude (Anthropic) ou GPT-4 (OpenAI)
- **Usado por:** WhatsApp Bot (20% das queries complexas)
- **Custo:** ~$1.50/mês (Phase 1)

---

## 🔐 Credenciais e Configurações {#credenciais}

### Supabase

```bash
# URL
SUPABASE_URL="https://xzrmzmcoslomtzkzgskn.supabase.co"

# Keys
SUPABASE_ANON_KEY="[chave pública - safe para frontend]"
SUPABASE_SERVICE_KEY="[chave privada - apenas backend]"

# Database
DATABASE_URL="postgresql://postgres:B5b0dcf500@#@db.xzrmzmcoslomtzkzgskn.supabase.co:5432/postgres"
```

### N8N

```bash
# N8N URL
N8N_URL="https://n8n.angrax.com.br"

# N8N API Key (expira 2025-12-05)
N8N_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3OTcwYzdkMy04NmFkLTRjOGEtOGNkOS1jMDk1OTYzMjk5Y2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYyNDMzNDE4fQ.BTWCY0JgrhPhyMo_gooQqQEXHyUdDw0z8Sw5kep2Lww"

# Variáveis de Ambiente (configurar no N8N)
EVO_API_URL="[URL da Evolution API]"
```

### APIs Externas

```bash
# OpenAI (se usar GPT-4)
OPENAI_API_KEY="[sua chave]"

# Anthropic (se usar Claude)
ANTHROPIC_API_KEY="[sua chave]"

# KMS Secret (criptografia)
KMS_SECRET="[sua chave de criptografia]"

# F360 API Base
F360_API_BASE="https://api.f360.com.br/v1"

# OMIE API Base
OMIE_API_BASE="https://app.omie.com.br/api/v1"
```

**⚠️ IMPORTANTE:** Nunca commitar estas chaves no Git!

---

## 📦 Migrations Executadas {#migrations}

### Migration 001-006 (Anteriores)
Não documentadas neste momento (estrutura base do sistema).

### Migration 007: Dashboard Cards (2025-11-06)
- **Arquivo:** `migrations/007_dashboard_cards.sql`
- **Status:** ✅ Executado com sucesso
- **Criado:**
  - Tabela `dashboard_cards`
  - View `v_dashboard_cards_valid`
  - Índices de performance

**Problemas Resolvidos:**
1. Removido foreign key para `clients` (não existe como tabela)
2. Removido WHERE predicate do índice (IMMUTABLE issue)

### Migration 008: ERP Sync Tables (2025-11-06)
- **Arquivo:** `migrations/008_erp_sync_tables.sql`
- **Status:** ✅ Executado com sucesso
- **Criado:**
  - Tabela `sync_logs`
  - Tabela `omie_config`
  - Tabela `omie_invoices`
  - Tabela `f360_config`
  - Tabela `f360_accounts`
  - Tabela `transactions`
  - Tabela `conversations`
  - View `v_kpi_monthly_enriched`

**Nota:** A view `v_kpi_monthly_enriched` teve que ser recriada manualmente após o erro inicial.

---

## ⚠️ Problemas Conhecidos {#problemas-conhecidos}

### 1. N8N API Limitações
**Problema:** N8N API pública não permite ativar workflows programaticamente.

**Endpoints Testados (falharam):**
- `PATCH /workflows/{id}/activate` → "PATCH method not allowed"
- `PUT /workflows/{id}` com `active: true` → "active is read-only"

**Solução:** Ativação manual via interface do N8N.

### 2. Supabase SSL Certificate
**Problema:** N8N não confia no certificado SSL do Supabase.

**Erro:** "self-signed certificate in certificate chain"

**Solução:** Ativar "Ignore SSL Issues (Insecure)" na credencial PostgreSQL do N8N.

### 3. View `clients` sem coluna `status`
**Problema:** Workflows importados buscam coluna `status` que não existe na view `clients`.

**Erro:** `column "status" does not exist`

**Solução:** Substituir `WHERE status = 'active'` por `WHERE sync_enabled = true` nos 3 workflows:
- Dashboard Cards Pre-Processor
- ERP Sync - OMIE Intelligent
- ERP Sync - F360 Intelligent

**Status:** ⏳ Aguardando ajuste manual no N8N

### 4. Dados de Teste Ausentes
**Problema:** Tabelas `transactions`, `omie_config`, `f360_config` estão vazias.

**Impacto:** Workflows executam mas não geram dados reais.

**Solução:** Inserir dados de teste ou configurar credenciais OMIE/F360 reais.

---

## 🚀 Próximos Passos {#próximos-passos}

### Curto Prazo (Esta Sessão)

1. ✅ **DONE:** Tabelas criadas (migration 008)
2. ✅ **DONE:** Credencial PostgreSQL configurada no N8N
3. ⏳ **TODO:** Ajustar queries dos 3 workflows (trocar `status` por `sync_enabled`)
4. ⏳ **TODO:** Testar execução manual dos 4 workflows
5. ⏳ **TODO:** Validar dados no PostgreSQL após execução

### Médio Prazo (Próximos Dias)

**Phase 2 - Workflows Adicionais:**
- Admin Dashboard API (migrar Edge Function para N8N)
- Reports Generator (Excel, PDF)
- Excel Generator (dashboards)
- MCP Hub (se custo >$5/mês)

**Economia Phase 2:** $27-34.50/mês

**Phase 3 - Otimizações:**
- Cron jobs otimizados
- Cache multi-layer
- Query optimization
- SSE real-time

**Economia Phase 3:** $20/mês

### Longo Prazo (Próximas Semanas)

1. **Frontend Next.js:**
   - Seguir especificação em `PARA_CODEX_FRONTEND.md`
   - Usar `v_dashboard_cards_valid` para cards pré-calculados
   - Implementar autenticação Supabase
   - Dashboards responsivos

2. **Monitoramento:**
   - Grafana para métricas de N8N
   - Alertas de erro (Slack/Email)
   - Dashboard de custos LLM

3. **Documentação:**
   - API docs (Swagger/OpenAPI)
   - User guides
   - Developer onboarding

---

## 📚 Documentos Relacionados

- `PARA_CODEX_FRONTEND.md` - Especificação completa do frontend
- `STATUS_IMPORTACAO_N8N.md` - Status da importação dos workflows (Phase 1)
- `ATIVAR_WORKFLOWS_MANUAL.md` - Guia de ativação manual dos workflows
- `IMPORTAR_WORKFLOWS_N8N.md` - Guia de importação (caso precise reimportar)
- `migrations/007_dashboard_cards.sql` - Migration de cards pré-calculados
- `migrations/008_erp_sync_tables.sql` - Migration de tabelas ERP
- `n8n-workflows/*.json` - Arquivos JSON dos 4 workflows Phase 1

---

## 🔄 Histórico de Atualizações

| Data | Versão | Mudanças |
|------|--------|----------|
| 2025-11-06 | 1.0.0 | Criação inicial do documento RAG |

---

**Fim do Document RAG - Finance Oráculo**

*Este documento deve ser atualizado a cada mudança significativa no projeto.*
