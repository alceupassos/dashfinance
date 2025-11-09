// =====================================================
// BUSCA DADOS F360 EM TEMPO REAL
// =====================================================
// Consulta a API do F360 para obter dados atualizados
// das empresas do grupo em tempo real

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface F360Config {
  token: string;
  baseUrl: string;
}

interface CompanyData {
  cnpj: string;
  name: string;
  balance: number;
  receivables: number;
  payables: number;
  lastUpdated: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { f360_token, query_type, date_start, date_end } = await req.json();

    if (!f360_token) {
      return new Response(
        JSON.stringify({ error: 'f360_token é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`🔍 Buscando dados F360 para token: ${f360_token.substring(0, 8)}...`);

    // Buscar configuração do F360
    const { data: integration, error: integrationError } = await supabase
      .from('integration_f360')
      .select('token_enc, base_url, company_cnpj')
      .eq('token_enc', f360_token)
      .single();

    if (integrationError || !integration) {
      console.error('❌ Erro ao buscar integração F360:', integrationError);
      return new Response(
        JSON.stringify({ error: 'Integração F360 não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const baseUrl = integration.base_url || 'https://api.f360.com.br/v1';

    // Determinar tipo de consulta
    let data;
    switch (query_type) {
      case 'balance':
        data = await fetchBalance(f360_token, baseUrl);
        break;
      case 'dre':
        data = await fetchDRE(f360_token, baseUrl, date_start, date_end);
        break;
      case 'cashflow':
        data = await fetchCashflow(f360_token, baseUrl, date_start, date_end);
        break;
      case 'receivables':
        data = await fetchReceivables(f360_token, baseUrl);
        break;
      case 'payables':
        data = await fetchPayables(f360_token, baseUrl);
        break;
      case 'overview':
        data = await fetchOverview(f360_token, baseUrl);
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'query_type inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Cache no banco
    await supabase.from('erp_cache').upsert({
      f360_token,
      query_type,
      data,
      cached_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutos
    });

    return new Response(
      JSON.stringify({ success: true, data, cached_at: new Date().toISOString() }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// =====================================================
// FUNÇÕES DE CONSULTA F360
// =====================================================

async function fetchBalance(token: string, baseUrl: string) {
  console.log('💰 Buscando saldo...');
  
  const response = await fetch(`${baseUrl}/financial/balance`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`F360 API error: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    total_balance: data.total_balance || 0,
    available_balance: data.available_balance || 0,
    blocked_balance: data.blocked_balance || 0,
    accounts: data.accounts || [],
  };
}

async function fetchDRE(token: string, baseUrl: string, dateStart?: string, dateEnd?: string) {
  console.log('📊 Buscando DRE...');
  
  const start = dateStart || new Date(new Date().setDate(1)).toISOString().split('T')[0];
  const end = dateEnd || new Date().toISOString().split('T')[0];

  const response = await fetch(
    `${baseUrl}/reports/dre?date_start=${start}&date_end=${end}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`F360 API error: ${response.status}`);
  }

  return await response.json();
}

async function fetchCashflow(token: string, baseUrl: string, dateStart?: string, dateEnd?: string) {
  console.log('💵 Buscando fluxo de caixa...');
  
  const start = dateStart || new Date(new Date().setDate(1)).toISOString().split('T')[0];
  const end = dateEnd || new Date().toISOString().split('T')[0];

  const response = await fetch(
    `${baseUrl}/financial/cashflow?date_start=${start}&date_end=${end}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`F360 API error: ${response.status}`);
  }

  return await response.json();
}

async function fetchReceivables(token: string, baseUrl: string) {
  console.log('📥 Buscando contas a receber...');
  
  const response = await fetch(`${baseUrl}/financial/receivables?status=pending`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`F360 API error: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    total: data.total || 0,
    count: data.count || 0,
    overdue: data.overdue || 0,
    overdue_count: data.overdue_count || 0,
    items: data.items || [],
  };
}

async function fetchPayables(token: string, baseUrl: string) {
  console.log('📤 Buscando contas a pagar...');
  
  const response = await fetch(`${baseUrl}/financial/payables?status=pending`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`F360 API error: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    total: data.total || 0,
    count: data.count || 0,
    overdue: data.overdue || 0,
    overdue_count: data.overdue_count || 0,
    items: data.items || [],
  };
}

async function fetchOverview(token: string, baseUrl: string) {
  console.log('📈 Buscando visão geral...');
  
  const [balance, receivables, payables] = await Promise.all([
    fetchBalance(token, baseUrl),
    fetchReceivables(token, baseUrl),
    fetchPayables(token, baseUrl),
  ]);

  return {
    balance,
    receivables,
    payables,
    net_position: balance.available_balance + receivables.total - payables.total,
  };
}

