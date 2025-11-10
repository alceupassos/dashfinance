import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Query real para KPIs mensais
    const query = `
      SELECT
        TO_CHAR(month, 'MM/YYYY') as month_label,
        revenue,
        expenses,
        profit,
        CASE
          WHEN revenue > 0 THEN ROUND((profit / revenue * 100)::numeric, 2)
          ELSE 0
        END as margin_percent
      FROM v_kpi_monthly_enriched
      WHERE company_cnpj = $1
      ORDER BY month DESC
      LIMIT 12;
    `;

    const { data: kpisData, error: kpisError } = await supabase
      .rpc('execute_sql', { query_text: query, params: [cnpj || alias] });

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
