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
    const companyCnpj = url.searchParams.get('company_cnpj')
      || url.searchParams.get('cnpj');
    const limit = Number(url.searchParams.get('limit') ?? '6');

    if (!companyCnpj) {
      return new Response(JSON.stringify({ error: 'company_cnpj é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: kpis, error } = await supabase
      .from('financial_kpi_monthly')
      .select('*')
      .eq('company_cnpj', companyCnpj)
      .order('month', { ascending: false })
      .limit(Number.isFinite(limit) && limit > 0 ? limit : 6);

    if (error) {
      throw error;
    }

    const entries = (kpis ?? []).map((entry) => {
      const month = entry.month ?? new Date().toISOString().slice(0, 10);
      const receita = Number(entry.receita ?? 0);
      const custos = Number(entry.custos ?? 0);
      const ebitda = Number(entry.ebitda ?? 0);
      const margem_bruta = Number(entry.margem_bruta ?? 0);
      const lucro_bruto = receita - custos;
      const margem_liquida = receita !== 0 ? lucro_bruto / receita : 0;

      return {
        month: typeof month === 'string' ? month.slice(0, 7) : new Date(month).toISOString().slice(0, 7),
        receita,
        custos,
        ebitda,
        margem_bruta,
        margem_liquida,
        lucro_bruto,
      };
    });

    const latest = entries[0];
    const previous = entries[1];

    const summary = latest ? {
      receita: latest.receita,
      custos: latest.custos,
      ebitda: latest.ebitda,
      margem_bruta: latest.margem_bruta,
      margem_liquida: latest.margem_liquida,
      lucro_bruto: latest.lucro_bruto,
    } : null;

    const variation = latest && previous ? {
      receita: previous.receita === 0 ? null : (latest.receita - previous.receita) / Math.abs(previous.receita),
      custos: previous.custos === 0 ? null : (latest.custos - previous.custos) / Math.abs(previous.custos),
      ebitda: previous.ebitda === 0 ? null : (latest.ebitda - previous.ebitda) / Math.abs(previous.ebitda),
      margem_bruta: previous.margem_bruta === 0 ? null : latest.margem_bruta - previous.margem_bruta,
      margem_liquida: previous.margem_liquida === 0 ? null : latest.margem_liquida - previous.margem_liquida,
    } : null;

    return new Response(
      JSON.stringify({
        company_cnpj: companyCnpj,
        metrics: entries,
        summary,
        variation,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[relatorios-kpis] error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
