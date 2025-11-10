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
    const cnpj = url.searchParams.get('cnpj') || url.searchParams.get('alias');

    if (!cnpj) {
      return new Response(JSON.stringify({ error: 'cnpj ou alias é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar dados reais de DRE
    const { data: receitas } = await supabase
      .from('dre_entries')
      .select('amount')
      .eq('company_cnpj', cnpj)
      .eq('nature', 'receita');

    const { data: custos } = await supabase
      .from('dre_entries')
      .select('amount')
      .eq('company_cnpj', cnpj)
      .eq('nature', 'custo');

    const { data: despesas } = await supabase
      .from('dre_entries')
      .select('amount')
      .eq('company_cnpj', cnpj)
      .eq('nature', 'despesa');

    const revenue = receitas?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
    const costs = custos?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
    const expenses = despesas?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
    const ebitda = revenue - costs - expenses;
    const margin = revenue > 0 ? (ebitda / revenue) * 100 : 0;

    const metrics = {
      revenue,
      costs,
      expenses,
      ebitda,
      margin: Math.round(margin * 10) / 10,
      generated_at: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(metrics),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in dashboard-metrics:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
