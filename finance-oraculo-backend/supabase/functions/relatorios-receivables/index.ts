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
    const companyCnpj = url.searchParams.get('company_cnpj') || url.searchParams.get('cnpj');
    const empresaId = url.searchParams.get('empresa_id');
    const status = url.searchParams.get('status');
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    const limit = Number(url.searchParams.get('limit') ?? '100');
    const offset = Number(url.searchParams.get('offset') ?? '0');

    if (!companyCnpj && !empresaId) {
      return new Response(JSON.stringify({ error: 'company_cnpj ou empresa_id são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let query = supabase
      .from('contas_receber')
      .select('*', { count: 'exact' })
      .order('data_vencimento', { ascending: true })
      .range(offset, offset + (Number.isFinite(limit) && limit > 0 ? limit : 100) - 1);

    if (companyCnpj) {
      query = query.eq('company_cnpj', companyCnpj);
    }

    if (empresaId) {
      query = query.eq('empresa_id', empresaId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (dateFrom) {
      query = query.gte('data_vencimento', dateFrom);
    }

    if (dateTo) {
      query = query.lte('data_vencimento', dateTo);
    }

    const { data: contas, error } = await query;

    if (error) {
      throw error;
    }

    const rows = contas ?? [];
    const total = rows.length;
    const totalValor = rows.reduce((acc, row) => acc + Number(row.valor ?? 0), 0);
    const vencidas = rows.filter((row) => {
      if (row.status && row.status !== 'pendente') return false;
      const vencimento = row.data_vencimento ? new Date(row.data_vencimento) : null;
      if (!vencimento) return false;
      return vencimento < new Date();
    });
    const totalVencidas = vencidas.reduce((acc, row) => acc + Number(row.valor ?? 0), 0);

    const groupedPorCliente = rows.reduce<Record<string, number>>((acc, row) => {
      const key = row.cliente ?? 'Outros';
      acc[key] = (acc[key] ?? 0) + Number(row.valor ?? 0);
      return acc;
    }, {});

    return new Response(
      JSON.stringify({
        company_cnpj: companyCnpj ?? null,
        empresa_id: empresaId ?? null,
        total_registros: total,
        valor_total: totalValor,
        valor_atrasado: totalVencidas,
        agrupado_cliente: groupedPorCliente,
        itens: rows,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[relatorios-receivables] error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
