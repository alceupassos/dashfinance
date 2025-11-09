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

    // Buscar DRE entries dos últimos N meses
    const dataInicio = new Date();
    dataInicio.setMonth(dataInicio.getMonth() - limit);
    const dataInicioStr = dataInicio.toISOString().slice(0, 10);

    const { data: dreEntries, error } = await supabase
      .from('dre_entries')
      .select('date, nature, amount')
      .eq('company_cnpj', companyCnpj)
      .gte('date', dataInicioStr)
      .order('date', { ascending: false });

    if (error) {
      throw error;
    }

    // Agrupar por mês e calcular KPIs
    const kpisPorMes = new Map<string, any>();
    
    (dreEntries || []).forEach(entry => {
      const month = entry.date.slice(0, 7);
      if (!kpisPorMes.has(month)) {
        kpisPorMes.set(month, {
          month,
          receita: 0,
          custos: 0,
          despesas: 0,
          outras: 0,
        });
      }
      
      const kpi = kpisPorMes.get(month);
      const amount = Number(entry.amount || 0);
      
      if (entry.nature === 'receita') {
        kpi.receita += amount;
      } else if (entry.nature === 'custo') {
        kpi.custos += Math.abs(amount);
      } else if (entry.nature === 'despesa') {
        kpi.despesas += Math.abs(amount);
      } else if (entry.nature === 'outras') {
        kpi.outras += amount;
      }
    });

    // Calcular métricas derivadas
    const entries = Array.from(kpisPorMes.values())
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, limit)
      .map(kpi => {
        const lucro_bruto = kpi.receita - kpi.custos;
        const ebitda = lucro_bruto - kpi.despesas;
        const margem_bruta = kpi.receita !== 0 ? lucro_bruto / kpi.receita : 0;
        const margem_liquida = kpi.receita !== 0 ? ebitda / kpi.receita : 0;

        return {
          month: kpi.month,
          receita: kpi.receita,
          custos: kpi.custos,
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
