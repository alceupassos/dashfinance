import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DREStructured {
  periodo: string;
  receita_bruta: number;
  deducoes: number;
  receita_liquida: number;
  custos: number;
  lucro_bruto: number;
  despesas_operacionais: number;
  ebitda: number;
  depreciacao: number;
  ebit: number;
  despesas_financeiras: number;
  receitas_financeiras: number;
  lucro_antes_ir: number;
  ir_csll: number;
  lucro_liquido: number;
}

function calcularDRE(entries: any[], periodo: string): DREStructured {
  // Agrupa por nature e account
  const receitas = entries.filter(e => e.nature === 'receita');
  const custos = entries.filter(e => e.nature === 'custo');
  const despesas = entries.filter(e => e.nature === 'despesa');
  const outras = entries.filter(e => e.nature === 'outras');

  const receitaBruta = receitas.reduce((acc, e) => acc + (e.amount || 0), 0);
  const deducoes = receitas
    .filter(e => e.account?.toLowerCase().includes('deduc'))
    .reduce((acc, e) => acc + Math.abs(e.amount || 0), 0);
  
  const receitaLiquida = receitaBruta - deducoes;

  const totalCustos = custos.reduce((acc, e) => acc + Math.abs(e.amount || 0), 0);
  const lucroBruto = receitaLiquida - totalCustos;

  const despesasOp = despesas
    .filter(e => !e.account?.toLowerCase().includes('financ'))
    .reduce((acc, e) => acc + Math.abs(e.amount || 0), 0);

  const ebitda = lucroBruto - despesasOp;

  const depreciacao = despesas
    .filter(e => e.account?.toLowerCase().includes('deprecia'))
    .reduce((acc, e) => acc + Math.abs(e.amount || 0), 0);

  const ebit = ebitda - depreciacao;

  const despesasFinanceiras = despesas
    .filter(e => e.account?.toLowerCase().includes('financ') && e.amount < 0)
    .reduce((acc, e) => acc + Math.abs(e.amount || 0), 0);

  const receitasFinanceiras = outras
    .filter(e => e.account?.toLowerCase().includes('financ') && e.amount > 0)
    .reduce((acc, e) => acc + (e.amount || 0), 0);

  const lucroAntesIr = ebit - despesasFinanceiras + receitasFinanceiras;

  // Estimativa de IR/CSLL (34% sobre lucro)
  const irCsll = lucroAntesIr > 0 ? lucroAntesIr * 0.34 : 0;

  const lucroLiquido = lucroAntesIr - irCsll;

  return {
    periodo,
    receita_bruta: receitaBruta,
    deducoes: -deducoes,
    receita_liquida: receitaLiquida,
    custos: -totalCustos,
    lucro_bruto: lucroBruto,
    despesas_operacionais: -despesasOp,
    ebitda,
    depreciacao: -depreciacao,
    ebit,
    despesas_financeiras: -despesasFinanceiras,
    receitas_financeiras: receitasFinanceiras,
    lucro_antes_ir: lucroAntesIr,
    ir_csll: -irCsll,
    lucro_liquido: lucroLiquido,
  };
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

    // Validar JWT do usuário
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse query params
    const url = new URL(req.url);
    const periodo = url.searchParams.get('periodo') || new Date().toISOString().slice(0, 7); // YYYY-MM
    let cnpj = url.searchParams.get('cnpj') || url.searchParams.get('company_cnpj');

    if (!cnpj) {
      return new Response(
        JSON.stringify({ error: 'cnpj ou company_cnpj é obrigatório' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Aceitar UUID ou CNPJ
    if (cnpj.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: cliente } = await supabase
        .from('clientes')
        .select('id')
        .eq('id', cnpj)
        .single();
      cnpj = cliente?.id || cnpj;
    }

    const companyCnpj = cnpj;

    // Buscar DRE do período
    const mesInicio = `${periodo}-01`;
    const mesProximo = new Date(periodo + '-01');
    mesProximo.setMonth(mesProximo.getMonth() + 1);
    const mesFim = mesProximo.toISOString().slice(0, 10);

    const { data: entries, error: dreError } = await supabase
      .from('dre_entries')
      .select('*')
      .eq('company_cnpj', companyCnpj)
      .gte('date', mesInicio)
      .lt('date', mesFim);

    if (dreError) {
      throw dreError;
    }

    const dre = calcularDRE(entries || [], periodo);

    // Buscar histórico dos últimos 6 meses
    const historico: DREStructured[] = [];
    const dataBase = new Date(periodo + '-01');

    for (let i = 5; i >= 0; i--) {
      const dataHistorico = new Date(dataBase);
      dataHistorico.setMonth(dataHistorico.getMonth() - i);
      const periodoHistorico = dataHistorico.toISOString().slice(0, 7);

      const mesInicioHist = `${periodoHistorico}-01`;
      const mesProximoHist = new Date(periodoHistorico + '-01');
      mesProximoHist.setMonth(mesProximoHist.getMonth() + 1);
      const mesFimHist = mesProximoHist.toISOString().slice(0, 10);

      const { data: entriesHist } = await supabase
        .from('dre_entries')
        .select('*')
        .eq('company_cnpj', companyCnpj)
        .gte('date', mesInicioHist)
        .lt('date', mesFimHist);

      historico.push(calcularDRE(entriesHist || [], periodoHistorico));
    }

    return new Response(
      JSON.stringify({
        dre,
        historico,
        periodo,
        empresa_cnpj: companyCnpj,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('DRE error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

