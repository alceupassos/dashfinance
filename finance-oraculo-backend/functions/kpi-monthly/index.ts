// =====================================================
// Edge Function: kpi/monthly
// Purpose: Retornar dados completos do dashboard financeiro
// Query params: cnpj, alias, from, to
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KPICard {
  label: string;
  value: number;
  delta?: number;
  caption?: string;
}

interface LineSeriesData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface CashflowData {
  category: string;
  in: number;
  out: number;
}

interface BridgeData {
  label: string;
  type: 'increase' | 'decrease' | 'total';
  amount: number;
}

interface TableRow {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  margin_percent: number;
}

interface KPIMonthlyResponse {
  cards: KPICard[];
  lineSeries: LineSeriesData[];
  cashflow: CashflowData[];
  bridge: BridgeData[];
  table: TableRow[];
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autenticação não fornecido' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse query params
    const url = new URL(req.url);
    const cnpjParam = url.searchParams.get('cnpj');
    const aliasParam = url.searchParams.get('alias');
    const fromParam = url.searchParams.get('from');
    const toParam = url.searchParams.get('to');

    // Determine CNPJs to query
    let cnpjs: string[] = [];

    if (aliasParam) {
      // Get CNPJs from alias (grupo)
      const { data: members, error: membersError } = await supabase
        .from('group_alias_members')
        .select('company_cnpj')
        .eq('alias_id', aliasParam);

      if (membersError) {
        console.error('Alias members error:', membersError);
        return new Response(
          JSON.stringify({ error: 'Erro ao buscar empresas do grupo' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      cnpjs = members?.map(m => m.company_cnpj) || [];

      if (cnpjs.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Grupo não contém empresas' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    } else if (cnpjParam) {
      cnpjs = [cnpjParam];
    } else {
      return new Response(
        JSON.stringify({ error: 'Parâmetro cnpj ou alias é obrigatório' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // TODO: Validar se usuário tem acesso aos CNPJs
    // Para agora, assumir acesso

    // Date range
    const today = new Date();
    const from = fromParam ? new Date(fromParam) : new Date(today.getFullYear(), today.getMonth() - 11, 1);
    const to = toParam ? new Date(toParam) : today;

    // ==================== QUERY KPIs ====================

    // Query v_kpi_monthly_enriched
    const { data: kpiData, error: kpiError } = await supabase
      .from('v_kpi_monthly_enriched')
      .select('*')
      .in('company_cnpj', cnpjs)
      .gte('month', from.toISOString())
      .lte('month', to.toISOString())
      .order('month', { ascending: true });

    if (kpiError) {
      console.error('KPI error:', kpiError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar KPIs' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ==================== BUILD LINE SERIES ====================
    const lineSeries: LineSeriesData[] = (kpiData || []).map(row => ({
      month: row.month ? new Date(row.month).toISOString().substring(0, 7) : '',
      revenue: Number(row.revenue) || 0,
      expenses: Number(row.expenses) || 0,
      profit: Number(row.profit) || 0,
    }));

    // ==================== BUILD CARDS ====================
    const totalRevenue = lineSeries.reduce((acc, item) => acc + item.revenue, 0);
    const totalExpenses = lineSeries.reduce((acc, item) => acc + item.expenses, 0);
    const totalProfit = totalRevenue - totalExpenses;

    const currentMonthData = lineSeries[lineSeries.length - 1];
    const previousMonthData = lineSeries[lineSeries.length - 2];

    const revenueDelta = previousMonthData
      ? ((currentMonthData.revenue - previousMonthData.revenue) / previousMonthData.revenue) * 100
      : 0;

    const expensesDelta = previousMonthData
      ? ((currentMonthData.expenses - previousMonthData.expenses) / previousMonthData.expenses) * 100
      : 0;

    const cards: KPICard[] = [
      {
        label: 'Receita Total',
        value: totalRevenue,
        delta: revenueDelta,
        caption: 'Últimos 12 meses',
      },
      {
        label: 'Despesas Totais',
        value: totalExpenses,
        delta: expensesDelta,
        caption: 'Últimos 12 meses',
      },
      {
        label: 'Lucro Total',
        value: totalProfit,
        caption: 'Últimos 12 meses',
      },
      {
        label: 'Margem',
        value: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
        caption: 'Percentual médio',
      },
    ];

    // ==================== BUILD CASHFLOW ====================
    // Mock data - substituir com query real de cashflow_entries
    const cashflow: CashflowData[] = [
      { category: 'Operacional', in: totalRevenue * 0.7, out: totalExpenses * 0.6 },
      { category: 'Investimentos', in: totalRevenue * 0.2, out: totalExpenses * 0.3 },
      { category: 'Financeiro', in: totalRevenue * 0.1, out: totalExpenses * 0.1 },
    ];

    // ==================== BUILD BRIDGE ====================
    const lastMonthProfit = previousMonthData?.profit || 0;
    const currentMonthProfit = currentMonthData?.profit || 0;
    const profitChange = currentMonthProfit - lastMonthProfit;

    const bridge: BridgeData[] = [
      { label: 'Mês Anterior', type: 'total', amount: lastMonthProfit },
      {
        label: 'Receitas',
        type: currentMonthData.revenue > previousMonthData.revenue ? 'increase' : 'decrease',
        amount: Math.abs(currentMonthData.revenue - previousMonthData.revenue),
      },
      {
        label: 'Despesas',
        type: currentMonthData.expenses > previousMonthData.expenses ? 'decrease' : 'increase',
        amount: Math.abs(currentMonthData.expenses - previousMonthData.expenses),
      },
      { label: 'Mês Atual', type: 'total', amount: currentMonthProfit },
    ];

    // ==================== BUILD TABLE ====================
    const table: TableRow[] = lineSeries.map(row => ({
      month: row.month,
      revenue: row.revenue,
      expenses: row.expenses,
      profit: row.profit,
      margin_percent: row.revenue > 0 ? (row.profit / row.revenue) * 100 : 0,
    }));

    // ==================== RESPONSE ====================
    const response: KPIMonthlyResponse = {
      cards,
      lineSeries,
      cashflow,
      bridge,
      table,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('KPI Monthly error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
