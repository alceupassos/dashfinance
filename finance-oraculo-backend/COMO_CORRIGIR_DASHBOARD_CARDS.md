# 🔧 Como Corrigir o Dashboard Cards Workflow

**Data:** 2025-11-06
**Workflow:** Dashboard Cards Pre-Processor (ID: `pr1gms7avsjcmqd1`)
**Problema:** Query com nomes de colunas incorretos

---

## 📋 Passo a Passo

### 1. Abrir o Workflow no N8N
```
URL: https://n8n.angrax.com.br
Workflow: "Dashboard Cards Pre-Processor"
```

### 2. Localizar o Nó com Erro
**Nome do nó:** `PostgreSQL - Query All Data (1 request!)`

Este nó está com erro: `column "available_balance" does not exist`

### 3. Clicar no Nó
Clicar na caixinha do nó para abrir o painel lateral de edição.

### 4. Substituir a Query Completa

**Deletar** toda a query atual e **colar** a query corrigida abaixo:

```sql
-- Query ÚNICA que busca TODOS os dados necessários para os cards
WITH snapshot AS (
  SELECT
    cash_balance,
    available_for_payments as available_balance,
    snapshot_date,
    runway_days,
    monthly_burn as burn_rate_monthly,
    overdue_payables_count,
    overdue_payables_amount
  FROM daily_snapshots
  WHERE company_cnpj = '{{ $json.cnpj }}'
  ORDER BY snapshot_date DESC
  LIMIT 1
),
kpis_current AS (
  SELECT
    revenue as total_revenue,
    expenses as total_expenses,
    profit,
    month
  FROM v_kpi_monthly_enriched
  WHERE company_cnpj = '{{ $json.cnpj }}'
  ORDER BY month DESC
  LIMIT 1
),
kpis_previous AS (
  SELECT
    revenue as prev_revenue,
    expenses as prev_expenses
  FROM v_kpi_monthly_enriched
  WHERE company_cnpj = '{{ $json.cnpj }}'
  ORDER BY month DESC
  OFFSET 1
  LIMIT 1
),
invoices_overdue AS (
  SELECT
    COUNT(*) as qtd_vencidas,
    COALESCE(SUM(total_value), 0) as total_vencido
  FROM omie_invoices
  WHERE company_cnpj = '{{ $json.cnpj }}'
    AND status = 'overdue'
),
trend_12_months AS (
  SELECT
    json_agg(
      json_build_object(
        'month', TO_CHAR(month, 'MM/YYYY'),
        'revenue', revenue,
        'expenses', expenses,
        'profit', profit
      ) ORDER BY month
    ) as trend_data
  FROM v_kpi_monthly_enriched
  WHERE company_cnpj = '{{ $json.cnpj }}'
    AND month >= CURRENT_DATE - INTERVAL '12 months'
),
top_expenses AS (
  SELECT
    json_agg(
      json_build_object(
        'category', category,
        'amount', SUM(amount)
      ) ORDER BY SUM(amount) DESC
    ) as top_expenses_data
  FROM transactions
  WHERE company_cnpj = '{{ $json.cnpj }}'
    AND type = 'expense'
    AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE)
  GROUP BY category
  LIMIT 5
)
SELECT
  COALESCE(s.cash_balance, 0) as cash_balance,
  COALESCE(s.available_balance, 0) as available_balance,
  COALESCE(s.runway_days, 0) as runway_days,
  COALESCE(s.burn_rate_monthly, 0) as burn_rate_monthly,
  COALESCE(kc.total_revenue, 0) as total_revenue,
  COALESCE(kc.total_expenses, 0) as total_expenses,
  COALESCE(kc.profit, 0) as profit,
  COALESCE(kp.prev_revenue, 0) as prev_revenue,
  COALESCE(kp.prev_expenses, 0) as prev_expenses,
  COALESCE(io.qtd_vencidas, 0) as faturas_vencidas_count,
  COALESCE(io.total_vencido, 0) as faturas_vencidas_value,
  COALESCE(t.trend_data, '[]'::json) as trend_12_months,
  COALESCE(te.top_expenses_data, '[]'::json) as top_expenses,
  CASE
    WHEN COALESCE(kc.total_revenue, 0) > 0 THEN
      ROUND((COALESCE(kc.profit, 0) / kc.total_revenue * 100)::numeric, 2)
    ELSE 0
  END as margem_percent,
  30 as dso_days,
  45 as dpo_days,
  '{{ $json.cnpj }}' as company_cnpj,
  '{{ $json.name }}' as company_name
FROM
  snapshot s
CROSS JOIN kpis_current kc
CROSS JOIN kpis_previous kp
CROSS JOIN invoices_overdue io
CROSS JOIN trend_12_months t
CROSS JOIN top_expenses te;
```

### 5. Salvar
Clicar no botão **"Save"** (laranja no topo direito).

### 6. Testar (Opcional)
Clicar em **"Execute Workflow"** para testar.

**Nota:** Como não há dados nas tabelas (`transactions`, `daily_snapshots` vazias), a query retornará valores zerados, mas **não deve dar erro**.

---

## ✅ O que foi Corrigido

### 1. `available_balance` → `available_for_payments`
**Antes:**
```sql
SELECT available_balance FROM daily_snapshots
```

**Depois:**
```sql
SELECT available_for_payments as available_balance FROM daily_snapshots
```

### 2. Campos da view `v_kpi_monthly_enriched`
**Antes:**
```sql
SELECT total_revenue, total_expenses FROM v_kpi_monthly_enriched
```

**Depois:**
```sql
SELECT revenue as total_revenue, expenses as total_expenses FROM v_kpi_monthly_enriched
```

### 3. Campo `burn_rate_monthly`
**Antes:**
```sql
SELECT burn_rate_monthly FROM daily_snapshots
```

**Depois:**
```sql
SELECT monthly_burn as burn_rate_monthly FROM daily_snapshots
```

---

## 🧪 Teste Esperado

Após correção, ao executar o workflow:

**Sem dados (tabelas vazias):**
- ✅ Execução com sucesso (verde)
- ✅ Retorna JSON com valores zerados
- ❌ NÃO deve dar erro de query

**Com dados (futuro):**
- ✅ Retorna cards calculados
- ✅ Valores reais das empresas

---

## ⚠️ Observações

1. **DSO e DPO:** Estão com valores placeholder (30 e 45). Requerem cálculo mais complexo baseado em faturas/recebíveis.

2. **Dados Necessários:**
   - Tabela `daily_snapshots` precisa ter snapshots criados
   - Tabela `transactions` precisa ter transações
   - Tabela `omie_invoices` precisa ter faturas (se usar OMIE)

3. **Próximo Passo:** Popular dados de teste para validar workflow completo.

---

## 📄 Arquivo da Query

A query completa com comentários está salva em:
```
/Users/alceualvespasssosmac/dashfinance/finance-oraculo-backend/DASHBOARD_CARDS_QUERY_CORRIGIDA.sql
```

Você pode abrir este arquivo para copiar/colar facilmente.
