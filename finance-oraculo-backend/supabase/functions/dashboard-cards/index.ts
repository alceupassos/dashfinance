import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface DashboardCard {
  id: string;
  label: string;
  value: number;
  delta?: number;
  suffix?: string;
  caption?: string;
  trend?: 'up' | 'down' | 'flat';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const alias = url.searchParams.get('alias');
    const cnpj = url.searchParams.get('cnpj');

    if (!alias && !cnpj) {
      return new Response(JSON.stringify({ error: 'alias ou cnpj é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Query real para buscar dados do banco
    const query = `
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
        WHERE company_cnpj = $1
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
        WHERE company_cnpj = $1
        ORDER BY month DESC
        LIMIT 1
      ),
      kpis_previous AS (
        SELECT
          revenue as prev_revenue,
          expenses as prev_expenses
        FROM v_kpi_monthly_enriched
        WHERE company_cnpj = $1
        ORDER BY month DESC
        OFFSET 1
        LIMIT 1
      )
      SELECT
        COALESCE(s.cash_balance, 0) as cash_balance,
        COALESCE(s.available_balance, 0) as available_balance,
        COALESCE(kc.total_revenue, 0) as total_revenue,
        COALESCE(kc.total_expenses, 0) as total_expenses,
        COALESCE(kc.profit, 0) as profit,
        COALESCE(kp.prev_revenue, 0) as prev_revenue,
        COALESCE(kp.prev_expenses, 0) as prev_expenses,
        COALESCE(s.runway_days, 0) as runway_days,
        COALESCE(s.burn_rate_monthly, 0) as burn_rate_monthly,
        CASE
          WHEN COALESCE(kc.total_revenue, 0) > 0 THEN
            ROUND((COALESCE(kc.profit, 0) / kc.total_revenue * 100)::numeric, 2)
          ELSE 0
        END as margem_percent
      FROM
        snapshot s
      CROSS JOIN kpis_current kc
      CROSS JOIN kpis_previous kp;
    `;

    const { data: queryResult, error: queryError } = await supabase
      .rpc('execute_sql', { query_text: query, params: [cnpj || alias] });

    let data = queryResult?.[0];

    // Se não houver dados, usar fallback
    if (!data) {
      data = {
        cash_balance: 0,
        available_balance: 0,
        total_revenue: 0,
        total_expenses: 0,
        profit: 0,
        prev_revenue: 0,
        prev_expenses: 0,
        runway_days: 0,
        burn_rate_monthly: 0,
        margem_percent: 0
      };
    }

    // Calcular deltas
    const revenueChange = data.prev_revenue > 0 
      ? ((data.total_revenue - data.prev_revenue) / data.prev_revenue) * 100 
      : 0;
    
    const expenseChange = data.prev_expenses > 0 
      ? ((data.total_expenses - data.prev_expenses) / data.prev_expenses) * 100 
      : 0;

    const cards: DashboardCard[] = [
      {
        id: 'caixa',
        label: 'Total Caixa',
        value: data.cash_balance,
        suffix: 'R$',
        caption: 'saldo em caixa',
        trend: 'flat'
      },
      {
        id: 'disponivel',
        label: 'Disponível',
        value: data.available_balance,
        suffix: 'R$',
        caption: 'para pagamentos',
        trend: 'flat'
      },
      {
        id: 'receita',
        label: 'Receita',
        value: data.total_revenue,
        delta: revenueChange,
        suffix: 'R$',
        caption: 'vs mês anterior',
        trend: revenueChange > 0 ? 'up' : revenueChange < 0 ? 'down' : 'flat'
      },
      {
        id: 'despesas',
        label: 'Despesas',
        value: data.total_expenses,
        delta: expenseChange,
        suffix: 'R$',
        caption: 'vs mês anterior',
        trend: expenseChange > 0 ? 'down' : expenseChange < 0 ? 'up' : 'flat'
      },
      {
        id: 'resultado',
        label: 'Resultado',
        value: data.profit,
        suffix: 'R$',
        caption: 'lucro/prejuízo',
        trend: data.profit > 0 ? 'up' : data.profit < 0 ? 'down' : 'flat'
      },
      {
        id: 'margem',
        label: 'Margem',
        value: data.margem_percent,
        suffix: '%',
        caption: 'margem líquida',
        trend: data.margem_percent > 20 ? 'up' : data.margem_percent > 10 ? 'flat' : 'down'
      },
      {
        id: 'runway',
        label: 'Runway',
        value: data.runway_days,
        suffix: 'dias',
        caption: 'até capital zero',
        trend: data.runway_days > 90 ? 'up' : data.runway_days > 30 ? 'flat' : 'down'
      },
      {
        id: 'burn_rate',
        label: 'Burn Rate',
        value: data.burn_rate_monthly,
        suffix: 'R$/mês',
        caption: 'queima mensal',
        trend: 'flat'
      }
    ];

    return new Response(
      JSON.stringify({
        cards,
        generated_at: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in dashboard-cards:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
