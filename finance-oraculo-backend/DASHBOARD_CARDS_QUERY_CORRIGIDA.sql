-- Query CORRIGIDA para Dashboard Cards Pre-Processor
-- Nó: "PostgreSQL - Query All Data (1 request!)"
-- Data: 2025-11-06

-- Query ÚNICA que busca TODOS os dados necessários para os cards
WITH snapshot AS (
  SELECT
    cash_balance,
    available_for_payments as available_balance,  -- ✅ CORRIGIDO: era available_balance
    snapshot_date,
    runway_days,
    monthly_burn as burn_rate_monthly,  -- ✅ CORRIGIDO: campo correto
    overdue_payables_count,
    overdue_payables_amount
  FROM daily_snapshots
  WHERE company_cnpj = '{{ $json.cnpj }}'
  ORDER BY snapshot_date DESC
  LIMIT 1
),
kpis_current AS (
  SELECT
    revenue as total_revenue,  -- ✅ CORRIGIDO: campo correto
    expenses as total_expenses,  -- ✅ CORRIGIDO: campo correto
    profit,
    month
  FROM v_kpi_monthly_enriched
  WHERE company_cnpj = '{{ $json.cnpj }}'
  ORDER BY month DESC
  LIMIT 1
),
kpis_previous AS (
  SELECT
    revenue as prev_revenue,  -- ✅ CORRIGIDO: campo correto
    expenses as prev_expenses  -- ✅ CORRIGIDO: campo correto
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
        'revenue', revenue,  -- ✅ CORRIGIDO: campo correto
        'expenses', expenses,  -- ✅ CORRIGIDO: campo correto
        'profit', profit
      ) ORDER BY month
    ) as trend_data
  FROM v_kpi_monthly_enriched
  WHERE company_cnpj = '{{ $json.cnpj }}'
    AND month >= CURRENT_DATE - INTERVAL '12 months'
),
top_expenses_agg AS (
  SELECT
    category,
    SUM(amount) as total_amount
  FROM transactions
  WHERE company_cnpj = '{{ $json.cnpj }}'
    AND type = 'expense'
    AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE)
  GROUP BY category
  ORDER BY SUM(amount) DESC
  LIMIT 5
),
top_expenses AS (
  SELECT
    COALESCE(
      json_agg(
        json_build_object(
          'category', category,
          'amount', total_amount
        )
      ),
      '[]'::json
    ) as top_expenses_data
  FROM top_expenses_agg
)
SELECT
  -- Snapshot data
  COALESCE(s.cash_balance, 0) as cash_balance,
  COALESCE(s.available_balance, 0) as available_balance,
  COALESCE(s.runway_days, 0) as runway_days,
  COALESCE(s.burn_rate_monthly, 0) as burn_rate_monthly,

  -- Current KPIs
  COALESCE(kc.total_revenue, 0) as total_revenue,
  COALESCE(kc.total_expenses, 0) as total_expenses,
  COALESCE(kc.profit, 0) as profit,

  -- Previous KPIs (for comparison)
  COALESCE(kp.prev_revenue, 0) as prev_revenue,
  COALESCE(kp.prev_expenses, 0) as prev_expenses,

  -- Overdue invoices
  COALESCE(io.qtd_vencidas, 0) as faturas_vencidas_count,
  COALESCE(io.total_vencido, 0) as faturas_vencidas_value,

  -- Trend data
  COALESCE(t.trend_data, '[]'::json) as trend_12_months,

  -- Top expenses
  COALESCE(te.top_expenses_data, '[]'::json) as top_expenses,

  -- Calculated fields
  CASE
    WHEN COALESCE(kc.total_revenue, 0) > 0 THEN
      ROUND((COALESCE(kc.profit, 0) / kc.total_revenue * 100)::numeric, 2)
    ELSE 0
  END as margem_percent,

  -- DSO (Days Sales Outstanding) - simplificado
  30 as dso_days,  -- Placeholder: requer cálculo mais complexo

  -- DPO (Days Payable Outstanding) - simplificado
  45 as dpo_days,  -- Placeholder: requer cálculo mais complexo

  -- Company info
  '{{ $json.cnpj }}' as company_cnpj,
  '{{ $json.name }}' as company_name
FROM
  snapshot s
CROSS JOIN kpis_current kc
CROSS JOIN kpis_previous kp
CROSS JOIN invoices_overdue io
CROSS JOIN trend_12_months t
CROSS JOIN top_expenses te;
