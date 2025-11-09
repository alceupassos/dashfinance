# 📊 Finance Oráculo - Database Schema Reference

**Última Atualização:** 2025-11-06
**Database:** PostgreSQL 15 (Supabase)
**Connection:** `postgresql://postgres:B5b0dcf500@#@db.xzrmzmcoslomtzkzgskn.supabase.co:5432/postgres`

---

## 🗂️ Índice Rápido

- [Tabelas de Clientes](#clientes)
- [Tabelas Financeiras](#financeiras)
- [Tabelas de ERP Sync](#erp-sync)
- [Tabelas de WhatsApp](#whatsapp)
- [Tabelas de Dashboard](#dashboard)
- [Views](#views)
- [Relacionamentos](#relacionamentos)

---

## 👥 Tabelas de Clientes {#clientes}

### `clients` (VIEW)
**Tipo:** View (não é tabela física)
**Descrição:** View sobre tabela `clientes` subjacente

```sql
\d clients

Colunas:
- id UUID
- name TEXT
- cnpj TEXT
- franchisee_name TEXT
- system_type TEXT
- integration_type TEXT
- integration_token TEXT (encrypted)
- api_token TEXT (encrypted)
- integration_status TEXT
- integration_settings JSONB
- last_connection_check TIMESTAMP
- connection_error_message TEXT
- last_sync_at TIMESTAMP
- sync_enabled BOOLEAN
- franqueado_id UUID
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ
```

**Índices:**
- (Dependem da tabela base `clientes`)

**Triggers:**
- `clients_insert_trigger` → `insert_client_via_view()`
- `clients_update_trigger` → `update_client_via_view()`
- `clients_delete_trigger` → `delete_client_via_view()`

**Queries Comuns:**
```sql
-- Listar empresas com sync ativado
SELECT cnpj, name, sync_enabled
FROM clients
WHERE sync_enabled = true
ORDER BY name;

-- Buscar empresa por CNPJ
SELECT * FROM clients WHERE cnpj = '00.000.000/0001-00';
```

**⚠️ IMPORTANTE:** NÃO use `WHERE status = 'active'` - esta coluna não existe! Use `WHERE sync_enabled = true`.

---

## 💰 Tabelas Financeiras {#financeiras}

### `transactions`
**Descrição:** Transações financeiras consolidadas de todos os ERPs

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_cnpj TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  description TEXT,
  amount DECIMAL(15,2) NOT NULL,
  type TEXT NOT NULL, -- 'income' ou 'expense'
  category TEXT,
  account_id TEXT,
  provider TEXT, -- 'OMIE', 'F360', 'MANUAL'
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT transactions_unique UNIQUE(company_cnpj, transaction_id, provider)
);
```

**Índices:**
- `idx_transactions_company` ON (company_cnpj)
- `idx_transactions_date` ON (transaction_date DESC)
- `idx_transactions_type` ON (type)

**Queries Comuns:**
```sql
-- Total de receitas e despesas do mês atual
SELECT
  company_cnpj,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as receitas,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as despesas
FROM transactions
WHERE transaction_date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY company_cnpj;

-- Últimas 10 transações
SELECT *
FROM transactions
WHERE company_cnpj = '00.000.000/0001-00'
ORDER BY transaction_date DESC
LIMIT 10;
```

---

### `daily_snapshots`
**Descrição:** Snapshots diários de métricas financeiras (já existia antes)

**Nota:** Ver migrations anteriores para estrutura detalhada.

---

## 🔄 Tabelas de ERP Sync {#erp-sync}

### `sync_logs`
**Descrição:** Logs de sincronização de todos os ERPs

```sql
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL, -- 'invoices', 'accounts', 'transactions'
  provider TEXT NOT NULL, -- 'OMIE', 'F360'
  company_cnpj TEXT NOT NULL,
  records_synced INTEGER DEFAULT 0,
  status TEXT NOT NULL, -- 'success', 'error', 'no_changes'
  message TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Índices:**
- `idx_sync_logs_company` ON (company_cnpj)
- `idx_sync_logs_provider` ON (provider)
- `idx_sync_logs_synced_at` ON (synced_at DESC)

**Queries Comuns:**
```sql
-- Últimos syncs de uma empresa
SELECT provider, sync_type, records_synced, status, synced_at
FROM sync_logs
WHERE company_cnpj = '00.000.000/0001-00'
ORDER BY synced_at DESC
LIMIT 10;

-- Syncs com erro nas últimas 24h
SELECT *
FROM sync_logs
WHERE status = 'error'
  AND synced_at > NOW() - INTERVAL '24 hours'
ORDER BY synced_at DESC;
```

---

### `omie_config`
**Descrição:** Configurações de API do OMIE por empresa

```sql
CREATE TABLE omie_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_cnpj TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL,
  app_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Índices:**
- `idx_omie_config_active` ON (is_active) WHERE is_active = true

**Queries Comuns:**
```sql
-- Empresas com OMIE ativo
SELECT c.cnpj, c.name, oc.api_key, oc.app_key
FROM clients c
JOIN omie_config oc ON oc.company_cnpj = c.cnpj
WHERE c.sync_enabled = true AND oc.is_active = true;
```

---

### `omie_invoices`
**Descrição:** Faturas sincronizadas do OMIE

```sql
CREATE TABLE omie_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_cnpj TEXT NOT NULL,
  invoice_id TEXT NOT NULL UNIQUE, -- 'OMIE_{codigo_lancamento}'
  invoice_number TEXT,
  provider TEXT NOT NULL DEFAULT 'OMIE',
  description TEXT,
  issue_date DATE,
  due_date DATE NOT NULL,
  payment_date DATE,
  total_value DECIMAL(15,2) NOT NULL,
  paid_value DECIMAL(15,2) DEFAULT 0,
  category TEXT,
  status TEXT NOT NULL, -- 'pending', 'paid', 'overdue'
  metadata JSONB,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Índices:**
- `idx_omie_invoices_company` ON (company_cnpj)
- `idx_omie_invoices_status` ON (status)
- `idx_omie_invoices_due_date` ON (due_date)
- `idx_omie_invoices_synced_at` ON (synced_at DESC)

**Queries Comuns:**
```sql
-- Faturas vencidas
SELECT *
FROM omie_invoices
WHERE company_cnpj = '00.000.000/0001-00'
  AND status = 'overdue'
ORDER BY due_date;

-- Total a pagar pendente
SELECT
  company_cnpj,
  SUM(total_value - paid_value) as total_pendente
FROM omie_invoices
WHERE status IN ('pending', 'overdue')
GROUP BY company_cnpj;
```

---

### `f360_config`
**Descrição:** Configurações de API do F360 por empresa

```sql
CREATE TABLE f360_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_cnpj TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Índices:**
- `idx_f360_config_active` ON (is_active) WHERE is_active = true

---

### `f360_accounts`
**Descrição:** Contas bancárias sincronizadas do F360

```sql
CREATE TABLE f360_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_cnpj TEXT NOT NULL,
  account_id TEXT NOT NULL UNIQUE, -- 'F360_{id}'
  account_name TEXT NOT NULL,
  balance DECIMAL(15,2) DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  account_type TEXT, -- 'checking', 'savings', 'investment'
  is_active BOOLEAN DEFAULT true,
  metadata JSONB,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Índices:**
- `idx_f360_accounts_company` ON (company_cnpj)
- `idx_f360_accounts_active` ON (is_active) WHERE is_active = true
- `idx_f360_accounts_synced_at` ON (synced_at DESC)

**Queries Comuns:**
```sql
-- Total em contas F360 de uma empresa
SELECT
  company_cnpj,
  SUM(balance) as total_balance
FROM f360_accounts
WHERE company_cnpj = '00.000.000/0001-00'
  AND is_active = true
GROUP BY company_cnpj;
```

---

## 💬 Tabelas de WhatsApp {#whatsapp}

### `conversations`
**Descrição:** Conversas do WhatsApp Bot por empresa

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  company_cnpj TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- 'active', 'ended'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(phone_number, company_cnpj)
);
```

**Índices:**
- `idx_conversations_phone` ON (phone_number)
- `idx_conversations_company` ON (company_cnpj)
- `idx_conversations_status` ON (status)

---

### `conversation_context`
**Descrição:** Contexto e histórico de conversas (já existia antes)

**Nota:** Ver migrations anteriores para estrutura detalhada.

---

## 📊 Tabelas de Dashboard {#dashboard}

### `dashboard_cards`
**Descrição:** Cards pré-calculados que expiram a cada 5 minutos

```sql
CREATE TABLE dashboard_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_cnpj TEXT NOT NULL,
  card_type TEXT NOT NULL,
  card_data JSONB NOT NULL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes',
  CONSTRAINT dashboard_cards_cnpj_type UNIQUE (company_cnpj, card_type)
);
```

**Índices:**
- `idx_dashboard_cards_company` ON (company_cnpj)
- `idx_dashboard_cards_expired` ON (expires_at)

**Tipos de Cards (12):**
1. `total_caixa`
2. `disponivel`
3. `receitas_mes`
4. `despesas_mes`
5. `faturas_vencidas`
6. `runway`
7. `burn_rate`
8. `dso`
9. `dpo`
10. `margem`
11. `grafico_tendencia`
12. `top_despesas`

**Estrutura do `card_data` JSONB:**
```json
{
  "value": 45230.50,
  "label": "Total Caixa",
  "formatted": "R$ 45.230,50",
  "icon": "dollar-sign",
  "change_pct": 5.2,
  "change_direction": "up",
  "status": "ok",
  "updated_at": "2025-11-06T10:30:00Z"
}
```

**Queries Comuns:**
```sql
-- Buscar todos os cards válidos de uma empresa
SELECT card_type, card_data
FROM dashboard_cards
WHERE company_cnpj = '00.000.000/0001-00'
  AND expires_at > NOW()
ORDER BY card_type;

-- Buscar um card específico
SELECT card_data
FROM dashboard_cards
WHERE company_cnpj = '00.000.000/0001-00'
  AND card_type = 'total_caixa'
  AND expires_at > NOW();
```

---

## 🔍 Views {#views}

### `v_dashboard_cards_valid`
**Descrição:** View que retorna apenas cards não expirados

```sql
CREATE VIEW v_dashboard_cards_valid AS
SELECT *
FROM dashboard_cards
WHERE expires_at > NOW();
```

**Uso no Frontend:**
```typescript
// Next.js - fetching cards
const { data } = await supabase
  .from('v_dashboard_cards_valid')
  .select('*')
  .eq('company_cnpj', cnpj);
```

---

### `v_kpi_monthly_enriched`
**Descrição:** KPIs mensais agregados de transações

```sql
CREATE VIEW v_kpi_monthly_enriched AS
SELECT
  company_cnpj,
  DATE_TRUNC('month', transaction_date) AS month,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS revenue,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expenses,
  SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) AS profit
FROM transactions
GROUP BY company_cnpj, DATE_TRUNC('month', transaction_date);
```

**Uso:**
```sql
-- Últimos 12 meses de KPIs
SELECT *
FROM v_kpi_monthly_enriched
WHERE company_cnpj = '00.000.000/0001-00'
  AND month >= NOW() - INTERVAL '12 months'
ORDER BY month DESC;
```

---

## 🔗 Relacionamentos {#relacionamentos}

```
clients (view)
  ├─ 1:N → omie_config (company_cnpj)
  ├─ 1:N → f360_config (company_cnpj)
  ├─ 1:N → transactions (company_cnpj)
  ├─ 1:N → dashboard_cards (company_cnpj)
  ├─ 1:N → conversations (company_cnpj)
  └─ 1:N → sync_logs (company_cnpj)

omie_config
  └─ 1:N → omie_invoices (company_cnpj)

f360_config
  └─ 1:N → f360_accounts (company_cnpj)

conversations
  └─ 1:N → conversation_context (conversation_id)
```

**Nota:** Relacionamentos implementados via queries, não foreign keys (para flexibilidade).

---

## 🛠️ Comandos Úteis

### Listar Todas as Tabelas
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### Ver Estrutura de uma Tabela
```sql
\d nome_da_tabela
```

### Ver Índices de uma Tabela
```sql
\di nome_da_tabela*
```

### Ver Views
```sql
\dv
```

### Tamanho das Tabelas
```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

**Fim do Database Schema Reference**
