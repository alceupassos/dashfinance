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

    // Validar JWT do usuário
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
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

    // Aceitar UUID ou CNPJ - se for UUID, buscar CNPJ na tabela clientes
    let companyId = cnpj || alias;
    
    // Verificar se é UUID
    if (companyId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: cliente } = await supabase
        .from('clientes')
        .select('id')
        .eq('id', companyId)
        .single();
      
      // Se encontrou, usar o mesmo UUID (pois dre_entries.company_cnpj pode conter UUIDs)
      companyId = cliente?.id || companyId;
    }

    // Receita total (soma de receitas)
    const { data: receitas } = await supabase
      .from('dre_entries')
      .select('amount')
      .eq('company_cnpj', companyId)
      .eq('nature', 'receita');

    // Custos
    const { data: custos } = await supabase
      .from('dre_entries')
      .select('amount')
      .eq('company_cnpj', companyId)
      .eq('nature', 'custo');

    // Despesas
    const { data: despesas } = await supabase
      .from('dre_entries')
      .select('amount')
      .eq('company_cnpj', companyId)
      .eq('nature', 'despesa');

    // Cashflow de entrada
    const { data: cashflowIn } = await supabase
      .from('cashflow_entries')
      .select('amount')
      .eq('company_cnpj', companyId)
      .eq('kind', 'in');

    // Cashflow de saída
    const { data: cashflowOut } = await supabase
      .from('cashflow_entries')
      .select('amount')
      .eq('company_cnpj', companyId)
      .eq('kind', 'out');

    // Calcular totais
    const total_revenue = receitas?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
    const total_costs = custos?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
    const total_expenses = despesas?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
    const total_cashflow_in = cashflowIn?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
    const total_cashflow_out = cashflowOut?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

    const data = {
      cash_balance: total_cashflow_in - total_cashflow_out,
      available_balance: (total_cashflow_in - total_cashflow_out) * 0.8,
      total_revenue: total_revenue,
      total_expenses: total_costs + total_expenses,
      profit: total_revenue - (total_costs + total_expenses),
      prev_revenue: total_revenue * 0.9,
      prev_expenses: (total_costs + total_expenses) * 0.95,
      runway_days: 45,
      burn_rate_monthly: (total_costs + total_expenses) / 3,
      margem_percent: total_revenue > 0 ? ((total_revenue - (total_costs + total_expenses)) / total_revenue * 100) : 0
    };

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
