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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verifica autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse query params
    const url = new URL(req.url);
    const search = url.searchParams.get('search');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    // Buscar empresas (assumindo que a tabela se chama 'grupos' baseado no schema)
    let query = supabase
      .from('grupos')
      .select('id, nome, cnpj, razao_social, logo_url, criado_em')
      .order('nome', { ascending: true })
      .limit(limit);

    if (search) {
      query = query.or(`nome.ilike.%${search}%,cnpj.ilike.%${search}%,razao_social.ilike.%${search}%`);
    }

    const { data: empresas, error: empresasError } = await query;

    if (empresasError) {
      throw empresasError;
    }

    // Para cada empresa, buscar integrações e métricas
    const empresasEnriquecidas = await Promise.all(
      (empresas || []).map(async (empresa) => {
        // Buscar integração F360
        const { data: f360 } = await supabase
          .from('integration_f360')
          .select('id, created_at')
          .eq('cnpj', empresa.cnpj)
          .maybeSingle();

        // Buscar integração Omie
        const { data: omie } = await supabase
          .from('integration_omie')
          .select('id, created_at')
          .eq('cliente_nome', empresa.nome)
          .maybeSingle();

        // Buscar último sync
        const { data: syncState } = await supabase
          .from('sync_state')
          .select('last_success_at, source')
          .eq('cnpj', empresa.cnpj)
          .order('last_success_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Buscar saldo atual (último snapshot)
        const { data: snapshot } = await supabase
          .from('daily_snapshots')
          .select('cash_balance, available_for_payments, runway_days')
          .eq('company_cnpj', empresa.cnpj)
          .order('snapshot_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Calcular inadimplência (contas a receber vencidas)
        const hoje = new Date().toISOString().split('T')[0];
        const { data: contasVencidas } = await supabase
          .from('contas_receber')
          .select('valor')
          .eq('empresa_id', empresa.id)
          .lt('data_vencimento', hoje)
          .eq('status', 'pendente');

        const inadimplencia = contasVencidas?.reduce((acc, c) => acc + (c.valor || 0), 0) || 0;

        // Buscar receita do mês
        const mesAtual = new Date().toISOString().slice(0, 7); // YYYY-MM
        const { data: dreEntries } = await supabase
          .from('dre_entries')
          .select('amount')
          .eq('company_cnpj', empresa.cnpj)
          .gte('date', `${mesAtual}-01`)
          .eq('nature', 'receita');

        const receitaMes = dreEntries?.reduce((acc, e) => acc + (e.amount || 0), 0) || 0;

        // Verificar WhatsApp ativo (se tem token de onboarding)
        const { data: whatsappToken } = await supabase
          .from('onboarding_tokens')
          .select('id, ativo')
          .eq('empresa_id', empresa.id)
          .eq('ativo', true)
          .maybeSingle();

        return {
          id: empresa.id,
          cnpj: empresa.cnpj || '',
          nome_fantasia: empresa.nome,
          razao_social: empresa.razao_social || empresa.nome,
          logo_url: empresa.logo_url,
          status: 'ativo', // Por padrão ativo (pode adicionar campo na tabela)
          integracao_f360: !!f360,
          integracao_omie: !!omie,
          whatsapp_ativo: !!whatsappToken,
          saldo_atual: snapshot?.cash_balance || 0,
          inadimplencia: inadimplencia,
          receita_mes: receitaMes,
          ultimo_sync: syncState?.last_success_at || null,
        };
      })
    );

    return new Response(
      JSON.stringify({
        empresas: empresasEnriquecidas,
        total: empresasEnriquecidas.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Empresas list error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

