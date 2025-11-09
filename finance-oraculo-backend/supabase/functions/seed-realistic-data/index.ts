// =====================================================
// EDGE FUNCTION: seed-realistic-data
// Gera dados realistas de DRE e Cashflow para TODOS os clientes
// Simula 6 meses de histórico financeiro
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../common/db.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🌱 Gerando dados realistas para todos os clientes...');

    // Buscar todos os clientes F360
    const { data: clientesF360 } = await supabase
      .from('integration_f360')
      .select('*');

    // Buscar todos os clientes Omie
    const { data: clientesOmie } = await supabase
      .from('integration_omie')
      .select('*');

    const resultados = {
      dre_entries: 0,
      cashflow_entries: 0,
      alerts: 0,
      companies: 0,
    };

    // Gerar dados para cada cliente F360
    for (const cliente of clientesF360 || []) {
      console.log(`📊 Gerando dados para: ${cliente.cliente_nome}`);
      await gerarDadosEmpresa(supabase, cliente.cnpj, cliente.cliente_nome, 'F360');
      resultados.companies++;
    }

    // Gerar dados para cada cliente Omie
    for (const cliente of clientesOmie || []) {
      console.log(`📊 Gerando dados para: ${cliente.cliente_nome}`);
      await gerarDadosEmpresa(supabase, cliente.cnpj, cliente.cliente_nome, 'OMIE');
      resultados.companies++;
    }

    // Contar registros criados
    const { count: dreCount } = await supabase
      .from('dre_entries')
      .select('*', { count: 'exact', head: true });
    
    const { count: cashflowCount } = await supabase
      .from('cashflow_entries')
      .select('*', { count: 'exact', head: true });

    const { count: alertCount } = await supabase
      .from('financial_alerts')
      .select('*', { count: 'exact', head: true });

    resultados.dre_entries = dreCount || 0;
    resultados.cashflow_entries = cashflowCount || 0;
    resultados.alerts = alertCount || 0;

    console.log('✅ Dados gerados com sucesso!', resultados);

    return new Response(JSON.stringify({
      success: true,
      resultados,
      message: `Dados realistas gerados para ${resultados.companies} empresas!`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('❌ Erro ao gerar dados:', err);
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : 'Erro desconhecido',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Gera dados realistas para uma empresa
 */
async function gerarDadosEmpresa(
  supabase: any,
  cnpj: string,
  nome: string,
  sistema: string
) {
  // Gerar dados dos últimos 6 meses
  const hoje = new Date();
  const meses = 6;

  let saldoAcumulado = gerarSaldoInicial();

  for (let i = meses; i >= 0; i--) {
    const data = new Date(hoje);
    data.setMonth(data.getMonth() - i);
    
    // Gerar 20-40 lançamentos por mês
    const numLancamentos = randomInt(20, 40);
    
    for (let j = 0; j < numLancamentos; j++) {
      const dataLancamento = new Date(data);
      dataLancamento.setDate(randomInt(1, 28));
      
      // 60% receitas, 40% despesas
      const ehReceita = Math.random() < 0.6;
      const valor = ehReceita 
        ? gerarValorReceita(nome)
        : gerarValorDespesa(nome);
      
      // Atualizar saldo
      saldoAcumulado += ehReceita ? valor : -valor;
      
      // Inserir DRE Entry
      await supabase.from('dre_entries').insert({
        cnpj,
        data: dataLancamento.toISOString().split('T')[0],
        tipo: ehReceita ? 'receita' : 'despesa',
        categoria: ehReceita ? gerarCategoriaReceita() : gerarCategoriaDespesa(),
        descricao: gerarDescricao(ehReceita, nome),
        valor,
        origem: sistema,
      });
      
      // Inserir Cashflow Entry
      await supabase.from('cashflow_entries').insert({
        cnpj,
        data: dataLancamento.toISOString().split('T')[0],
        tipo: ehReceita ? 'entrada' : 'saida',
        valor,
        saldo_atual: saldoAcumulado,
        saldo_projetado: saldoAcumulado + gerarProjecao(),
        descricao: gerarDescricao(ehReceita, nome),
        origem: sistema,
      });
    }
  }

  // Gerar alguns alertas se saldo estiver baixo
  if (saldoAcumulado < 5000) {
    await supabase.from('financial_alerts').insert({
      company_cnpj: cnpj,
      tipo_alerta: 'saldo_baixo',
      prioridade: saldoAcumulado < 1000 ? 'critica' : 'alta',
      titulo: 'Saldo Bancário Baixo',
      mensagem: `Saldo atual de R$ ${saldoAcumulado.toFixed(2)} está abaixo do mínimo recomendado.`,
      status: 'open',
      dados_contexto: {
        saldo_atual: saldoAcumulado,
        saldo_minimo: 5000,
        diferenca: 5000 - saldoAcumulado,
      },
    });
  }

  // Calcular inadimplência (simulada)
  const taxaInadimplencia = Math.random() * 20; // 0-20%
  if (taxaInadimplencia > 10) {
    await supabase.from('financial_alerts').insert({
      company_cnpj: cnpj,
      tipo_alerta: 'inadimplencia_alta',
      prioridade: taxaInadimplencia > 15 ? 'critica' : 'alta',
      titulo: 'Taxa de Inadimplência Elevada',
      mensagem: `Taxa de inadimplência em ${taxaInadimplencia.toFixed(1)}%, acima do limite de 10%.`,
      status: 'open',
      dados_contexto: {
        taxa_inadimplencia: taxaInadimplencia,
        limite: 10,
        titulos_vencidos: randomInt(10, 50),
      },
    });
  }
}

// Helpers
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function gerarSaldoInicial(): number {
  return randomInt(5000, 50000);
}

function gerarValorReceita(nome: string): number {
  // Volpe/Grandes: 5k-20k
  // Médias: 2k-10k
  // Pequenas: 500-5k
  if (nome.includes('VOLPE')) {
    return randomInt(5000, 20000);
  } else if (nome.includes('DEX') || nome.includes('ACQUA')) {
    return randomInt(2000, 10000);
  } else {
    return randomInt(500, 5000);
  }
}

function gerarValorDespesa(nome: string): number {
  return gerarValorReceita(nome) * 0.7; // Despesas ~70% das receitas
}

function gerarCategoriaReceita(): string {
  const categorias = [
    'Vendas de Produtos',
    'Prestação de Serviços',
    'Vendas à Vista',
    'Vendas a Prazo',
    'Outras Receitas',
  ];
  return categorias[randomInt(0, categorias.length - 1)];
}

function gerarCategoriaDespesa(): string {
  const categorias = [
    'Folha de Pagamento',
    'Fornecedores',
    'Aluguel',
    'Energia Elétrica',
    'Telefone/Internet',
    'Material de Consumo',
    'Impostos e Taxas',
    'Manutenção',
    'Marketing',
    'Outras Despesas',
  ];
  return categorias[randomInt(0, categorias.length - 1)];
}

function gerarDescricao(ehReceita: boolean, nomeEmpresa: string): string {
  if (ehReceita) {
    const descricoes = [
      `Venda de produtos - ${nomeEmpresa}`,
      `Recebimento de cliente - Nota Fiscal`,
      `Prestação de serviços`,
      `Venda à vista`,
      `Recebimento de parcela`,
    ];
    return descricoes[randomInt(0, descricoes.length - 1)];
  } else {
    const descricoes = [
      `Pagamento de fornecedor`,
      `Folha de pagamento`,
      `Aluguel - ${new Date().toLocaleString('pt-BR', { month: 'long' })}`,
      `Conta de energia`,
      `Material de limpeza`,
      `Impostos federais`,
      `Serviços terceirizados`,
    ];
    return descricoes[randomInt(0, descricoes.length - 1)];
  }
}

function gerarProjecao(): number {
  return randomInt(-5000, 10000);
}

