import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

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
    const cnpj = url.searchParams.get('cnpj');
    const alias = url.searchParams.get('alias');

    if (!cnpj && !alias) {
      return new Response(JSON.stringify({ error: 'cnpj ou alias é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar dados reais de DRE agrupados por mês
    const { data: dreData } = await supabase
      .from('dre_entries')
      .select('date, nature, amount')
      .eq('company_cnpj', cnpj || alias)
      .order('date', { ascending: false });

    // Agrupar por mês
    const monthlyData: Record<string, { revenue: number; expenses: number; costs: number }> = {};

    (dreData || []).forEach((entry: any) => {
      const date = new Date(entry.date);
      const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { revenue: 0, expenses: 0, costs: 0 };
      }

      if (entry.nature === 'receita') {
        monthlyData[monthKey].revenue += entry.amount || 0;
      } else if (entry.nature === 'custo') {
        monthlyData[monthKey].costs += entry.amount || 0;
      } else if (entry.nature === 'despesa') {
        monthlyData[monthKey].expenses += entry.amount || 0;
      }
    });

    const kpisData = Object.entries(monthlyData)
      .sort(([a], [b]) => new Date(`01/${b}`).getTime() - new Date(`01/${a}`).getTime())
      .slice(0, 12)
      .map(([month, data]) => ({
        month_label: month,
        revenue: data.revenue,
        expenses: data.expenses + data.costs,
        profit: data.revenue - (data.expenses + data.costs),
        margin_percent: data.revenue > 0 ? ((data.revenue - (data.expenses + data.costs)) / data.revenue) * 100 : 0
      }));

    const kpis = (kpisData || []).map((row: any) => ({
      month: row.month_label,
      revenue: row.revenue || 0,
      expenses: row.expenses || 0,
      profit: row.profit || 0,
      margin: row.margin_percent || 0
    })).reverse(); // Ordenar do mais antigo para o mais recente

    return new Response(
      JSON.stringify({
        kpis,
        generated_at: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in kpi-monthly:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
