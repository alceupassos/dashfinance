import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CashflowEntry {
  data: string;
  descricao: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  categoria: string;
  status: 'realizado' | 'previsto';
}

interface PrevisaoDia {
  data: string;
  saldo: number;
  status: 'ok' | 'atencao' | 'critico';
  emoji: string;
}

function calcularPrevisao7Dias(
  saldoAtual: number,
  movimentacoes: CashflowEntry[]
): PrevisaoDia[] {
  const previsao: PrevisaoDia[] = [];
  let saldo = saldoAtual;
  const hoje = new Date();

  for (let i = 0; i < 7; i++) {
    const data = new Date(hoje);
    data.setDate(data.getDate() + i);
    const dataStr = data.toISOString().split('T')[0];

    // Calcular movimentações do dia
    const movsdia = movimentacoes.filter(m => m.data === dataStr);
    const entradas = movsdia.filter(m => m.tipo === 'entrada').reduce((acc, m) => acc + m.valor, 0);
    const saidas = movsdia.filter(m => m.tipo === 'saida').reduce((acc, m) => acc + m.valor, 0);

    saldo = saldo + entradas - saidas;

    // Determinar status
    let status: 'ok' | 'atencao' | 'critico' = 'ok';
    let emoji = '✓';

    if (saldo < 50000) {
      status = 'critico';
      emoji = '🔴';
    } else if (saldo < 100000) {
      status = 'atencao';
      emoji = '⚠️';
    }

    previsao.push({
      data: dataStr,
      saldo,
      status,
      emoji,
    });
  }

  return previsao;
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
    const periodo = url.searchParams.get('periodo') || new Date().toISOString().slice(0, 7); // YYYY-MM
    const cnpj = url.searchParams.get('cnpj') || url.searchParams.get('company_cnpj');

    if (!cnpj) {
      return new Response(
        JSON.stringify({ error: 'cnpj ou company_cnpj é obrigatório' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const companyCnpj = cnpj;

    // Calcular saldo inicial baseado em cashflow entries anteriores
    const { data: entriesAnteriores } = await supabase
      .from('cashflow_entries')
      .select('kind, amount')
      .eq('company_cnpj', companyCnpj)
      .lt('date', `${periodo}-01`);

    const saldoInicial = (entriesAnteriores || []).reduce((acc, e) => {
      return acc + (e.kind === 'in' ? e.amount : -e.amount);
    }, 0);

    // Buscar movimentações do mês
    const mesInicio = `${periodo}-01`;
    const mesProximo = new Date(periodo + '-01');
    mesProximo.setMonth(mesProximo.getMonth() + 1);
    const mesFim = mesProximo.toISOString().slice(0, 10);

    const { data: entries, error: cfError } = await supabase
      .from('cashflow_entries')
      .select('*')
      .eq('company_cnpj', companyCnpj)
      .gte('date', mesInicio)
      .lt('date', mesFim)
      .order('date', { ascending: false });

    if (cfError) {
      throw cfError;
    }

    // Transformar entries em formato esperado
    const movimentacoes: CashflowEntry[] = (entries || []).map(e => ({
      data: e.date,
      descricao: e.category || 'Sem descrição',
      tipo: e.kind === 'in' ? 'entrada' : 'saida',
      valor: Math.abs(e.amount || 0),
      categoria: e.category || 'outros',
      status: 'realizado',
    }));

    // Calcular saldo final
    const totalEntradas = movimentacoes
      .filter(m => m.tipo === 'entrada')
      .reduce((acc, m) => acc + m.valor, 0);
    
    const totalSaidas = movimentacoes
      .filter(m => m.tipo === 'saida')
      .reduce((acc, m) => acc + m.valor, 0);

    const saldoFinal = saldoInicial + totalEntradas - totalSaidas;
    const saldoAtual = saldoFinal;

    // Previsão 7 dias simplificada (sem contas a pagar/receber)
    const previsao7Dias = calcularPrevisao7Dias(saldoAtual, movimentacoes);

    return new Response(
      JSON.stringify({
        saldo_inicial: saldoInicial,
        saldo_final: saldoFinal,
        saldo_atual: saldoAtual,
        total_entradas: totalEntradas,
        total_saidas: totalSaidas,
        movimentacoes: movimentacoes.slice(0, 30), // Últimas 30
        previsao_7_dias: previsao7Dias,
        periodo,
        empresa_cnpj: companyCnpj,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Cashflow error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

