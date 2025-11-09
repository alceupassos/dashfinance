// =====================================================
// EDGE FUNCTION: check-alerts
// Verifica todas as regras de alertas ativas e cria alertas quando necessário
// Executado via CRON a cada 15 minutos
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

    console.log('🔍 Iniciando verificação de alertas...');

    // 1. Buscar regras ativas
    const { data: rules, error: rulesError } = await supabase
      .from('alert_rules')
      .select('*')
      .eq('ativo', true);

    if (rulesError) {
      console.error('❌ Erro ao buscar regras:', rulesError);
      throw rulesError;
    }

    console.log(`📋 ${rules?.length || 0} regras ativas encontradas`);

    const resultados = {
      verificadas: 0,
      alertas_criados: 0,
      notificacoes_enviadas: 0,
      erros: 0,
    };

    // 2. Verificar cada regra
    for (const rule of rules || []) {
      try {
        // Verificar horário de silêncio
        const { data: isQuiet } = await supabase.rpc('fn_is_quiet_hours', {
          p_alert_rule_id: rule.id,
        });

        if (isQuiet) {
          console.log(`🔕 Regra ${rule.nome} em horário de silêncio`);
          continue;
        }

        // Verificar frequência
        const { data: canNotify } = await supabase.rpc('fn_check_notification_frequency', {
          p_alert_rule_id: rule.id,
          p_tipo_alerta: rule.tipo_alerta,
        });

        if (!canNotify) {
          console.log(`⏰ Regra ${rule.nome} aguardando frequência mínima`);
          continue;
        }

        // Executar verificação baseada no tipo de alerta
        const shouldAlert = await checkAlertRule(supabase, rule);

        if (shouldAlert) {
          console.log(`⚠️ Condição atendida para: ${rule.nome}`);

          // Criar alerta
          const alert = await criarAlerta(supabase, rule, shouldAlert);

          if (alert) {
            resultados.alertas_criados++;

            // Enviar notificações
            await enviarNotificacoes(supabase, alert, rule);
            resultados.notificacoes_enviadas++;
          }
        }

        resultados.verificadas++;
      } catch (err) {
        console.error(`❌ Erro ao verificar regra ${rule.nome}:`, err);
        resultados.erros++;
      }
    }

    console.log('✅ Verificação concluída:', resultados);

    return new Response(
      JSON.stringify({
        success: true,
        resultados,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('❌ Erro no check-alerts:', err);
    return new Response(
      JSON.stringify({ 
        error: err instanceof Error ? err.message : 'Erro desconhecido',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Verifica se a regra de alerta deve disparar
 */
async function checkAlertRule(supabase: any, rule: any): Promise<any | null> {
  const config = rule.config || {};
  
  switch (rule.tipo_alerta) {
    case 'saldo_baixo':
      return await checkSaldoBaixo(supabase, rule.company_cnpj, config);
    
    case 'inadimplencia_alta':
      return await checkInadimplenciaAlta(supabase, rule.company_cnpj, config);
    
    case 'fluxo_negativo':
      return await checkFluxoNegativo(supabase, rule.company_cnpj, config);
    
    case 'contas_vencendo':
      return await checkContasVencendo(supabase, rule.company_cnpj, config);
    
    case 'taxa_divergente':
      return await checkTaxaDivergente(supabase, rule.company_cnpj, config);
    
    case 'conciliacao_pendente':
      return await checkConciliacaoPendente(supabase, rule.company_cnpj, config);
    
    case 'faturamento_baixo':
      return await checkFaturamentoBaixo(supabase, rule.company_cnpj, config);
    
    case 'margem_baixa':
      return await checkMargemBaixa(supabase, rule.company_cnpj, config);
    
    default:
      console.warn(`⚠️ Tipo de alerta desconhecido: ${rule.tipo_alerta}`);
      return null;
  }
}

/**
 * CHECK: Saldo bancário baixo
 */
async function checkSaldoBaixo(supabase: any, cnpj: string, config: any) {
  const saldoMinimo = config.saldo_minimo || 5000;

  // Buscar saldo atual do último lançamento
  const { data } = await supabase
    .from('cashflow_entries')
    .select('saldo_atual, data')
    .eq('cnpj', cnpj)
    .order('data', { ascending: false })
    .limit(1)
    .single();

  if (!data || data.saldo_atual === null) {
    return null;
  }

  if (data.saldo_atual < saldoMinimo) {
    return {
      tipo: 'saldo_baixo',
      saldo_atual: data.saldo_atual,
      saldo_minimo: saldoMinimo,
      diferenca: saldoMinimo - data.saldo_atual,
      percentual: ((data.saldo_atual / saldoMinimo) * 100).toFixed(1),
    };
  }

  return null;
}

/**
 * CHECK: Inadimplência alta
 */
async function checkInadimplenciaAlta(supabase: any, cnpj: string, config: any) {
  const limitePercentual = config.limite_percentual || 10;

  // Calcular inadimplência
  const { data } = await supabase.rpc('fn_calcular_inadimplencia', {
    p_cnpj: cnpj,
  });

  if (!data) return null;

  const taxaInadimplencia = data.taxa_inadimplencia || 0;

  if (taxaInadimplencia > limitePercentual) {
    return {
      tipo: 'inadimplencia_alta',
      taxa_inadimplencia: taxaInadimplencia,
      limite: limitePercentual,
      titulos_vencidos: data.titulos_vencidos,
      valor_total: data.valor_total,
    };
  }

  return null;
}

/**
 * CHECK: Fluxo de caixa negativo
 */
async function checkFluxoNegativo(supabase: any, cnpj: string, config: any) {
  const diasProjecao = config.dias_projecao || 7;

  const dataFim = new Date();
  dataFim.setDate(dataFim.getDate() + diasProjecao);

  // Buscar saldo projetado
  const { data } = await supabase
    .from('cashflow_entries')
    .select('saldo_projetado')
    .eq('cnpj', cnpj)
    .lte('data', dataFim.toISOString().split('T')[0])
    .order('data', { ascending: false })
    .limit(1)
    .single();

  if (!data || data.saldo_projetado === null) {
    return null;
  }

  if (data.saldo_projetado < 0) {
    return {
      tipo: 'fluxo_negativo',
      saldo_projetado: data.saldo_projetado,
      dias_projecao: diasProjecao,
    };
  }

  return null;
}

/**
 * CHECK: Contas vencendo
 */
async function checkContasVencendo(supabase: any, cnpj: string, config: any) {
  const diasAntecedencia = config.dias_antecedencia || 3;
  const valorMinimo = config.valor_minimo || 500;

  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() + diasAntecedencia);

  // Buscar contas a pagar
  const { data, count } = await supabase
    .from('dre_entries')
    .select('*', { count: 'exact' })
    .eq('cnpj', cnpj)
    .eq('tipo', 'despesa')
    .lte('data_vencimento', dataLimite.toISOString().split('T')[0])
    .gte('valor', valorMinimo)
    .eq('status_pagamento', 'pendente');

  if (count && count > 0) {
    const valorTotal = data?.reduce((sum, item) => sum + (item.valor || 0), 0) || 0;
    return {
      tipo: 'contas_vencendo',
      quantidade: count,
      valor_total: valorTotal,
      dias_antecedencia: diasAntecedencia,
    };
  }

  return null;
}

/**
 * CHECK: Taxa divergente
 */
async function checkTaxaDivergente(supabase: any, cnpj: string, config: any) {
  const valorMinimoDivergencia = config.valor_minimo || 10;

  // Buscar divergências de taxa
  const { data } = await supabase
    .from('fee_validations')
    .select('*')
    .eq('company_cnpj', cnpj)
    .eq('status', 'pending')
    .gte('divergence', valorMinimoDivergencia)
    .order('transaction_date', { ascending: false })
    .limit(10);

  if (data && data.length > 0) {
    const totalDivergencia = data.reduce((sum, item) => sum + (item.divergence || 0), 0);
    return {
      tipo: 'taxa_divergente',
      quantidade: data.length,
      total_divergencia: totalDivergencia,
    };
  }

  return null;
}

/**
 * CHECK: Conciliação pendente
 */
async function checkConciliacaoPendente(supabase: any, cnpj: string, config: any) {
  const diasMaximo = config.dias_maximo || 5;

  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - diasMaximo);

  // Buscar reconciliações pendentes
  const { data, count } = await supabase
    .from('reconciliations')
    .select('*', { count: 'exact' })
    .eq('company_cnpj', cnpj)
    .eq('status', 'pending')
    .lte('reconciliation_date', dataLimite.toISOString().split('T')[0]);

  if (count && count > 0) {
    return {
      tipo: 'conciliacao_pendente',
      quantidade: count,
      dias_maximo: diasMaximo,
    };
  }

  return null;
}

/**
 * CHECK: Faturamento abaixo da meta
 */
async function checkFaturamentoBaixo(supabase: any, cnpj: string, config: any) {
  const metaMensal = config.meta_mensal || 100000;
  const percentualAlerta = config.percentual_alerta || 80;

  // Buscar faturamento do mês atual
  const mesAtual = new Date().toISOString().slice(0, 7); // YYYY-MM

  const { data } = await supabase
    .from('v_kpi_monthly')
    .select('receita_total')
    .eq('cnpj', cnpj)
    .eq('mes', mesAtual)
    .single();

  if (!data) return null;

  const percentualAtingido = (data.receita_total / metaMensal) * 100;

  if (percentualAtingido < percentualAlerta) {
    return {
      tipo: 'faturamento_baixo',
      receita_atual: data.receita_total,
      meta_mensal: metaMensal,
      percentual_atingido: percentualAtingido.toFixed(1),
    };
  }

  return null;
}

/**
 * CHECK: Margem de lucro baixa
 */
async function checkMargemBaixa(supabase: any, cnpj: string, config: any) {
  const margemMinima = config.margem_minima || 15;

  // Buscar margem do mês atual
  const mesAtual = new Date().toISOString().slice(0, 7);

  const { data } = await supabase
    .from('v_kpi_monthly')
    .select('margem_liquida')
    .eq('cnpj', cnpj)
    .eq('mes', mesAtual)
    .single();

  if (!data || data.margem_liquida === null) return null;

  if (data.margem_liquida < margemMinima) {
    return {
      tipo: 'margem_baixa',
      margem_atual: data.margem_liquida,
      margem_minima: margemMinima,
    };
  }

  return null;
}

/**
 * Cria alerta no banco de dados
 */
async function criarAlerta(supabase: any, rule: any, dados: any) {
  try {
    const prioridade = determinaPrioridade(rule.tipo_alerta, dados);
    const { titulo, mensagem } = gerarTextoAlerta(rule, dados);

    const { data, error } = await supabase
      .from('financial_alerts')
      .insert({
        company_cnpj: rule.company_cnpj,
        tipo_alerta: rule.tipo_alerta,
        prioridade,
        titulo,
        mensagem,
        dados_contexto: dados,
        status: 'open',
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar alerta:', error);
      return null;
    }

    console.log(`✅ Alerta criado: ${data.id}`);
    return data;
  } catch (err) {
    console.error('❌ Exceção ao criar alerta:', err);
    return null;
  }
}

/**
 * Determina prioridade baseado no tipo e dados
 */
function determinaPrioridade(tipo: string, dados: any): string {
  // Alertas sempre críticos
  if (['saldo_negativo', 'conta_bloqueada', 'protesto'].includes(tipo)) {
    return 'critica';
  }

  // Baseado em percentual
  if (dados.percentual !== undefined) {
    const p = parseFloat(dados.percentual);
    if (p < 50) return 'critica';
    if (p < 70) return 'alta';
    if (p < 90) return 'media';
  }

  // Saldo baixo
  if (tipo === 'saldo_baixo' && dados.diferenca > 10000) {
    return 'critica';
  }

  // Inadimplência
  if (tipo === 'inadimplencia_alta' && dados.taxa_inadimplencia > 20) {
    return 'critica';
  }

  return 'media';
}

/**
 * Gera título e mensagem do alerta
 */
function gerarTextoAlerta(rule: any, dados: any): { titulo: string; mensagem: string } {
  const textos: Record<string, any> = {
    saldo_baixo: {
      titulo: 'Saldo Bancário Baixo',
      mensagem: `Saldo atual de R$ ${dados.saldo_atual?.toFixed(2)} está abaixo do mínimo de R$ ${dados.saldo_minimo?.toFixed(2)}. Diferença: R$ ${dados.diferenca?.toFixed(2)} (${dados.percentual}% do mínimo).`,
    },
    inadimplencia_alta: {
      titulo: 'Taxa de Inadimplência Elevada',
      mensagem: `Taxa de inadimplência em ${dados.taxa_inadimplencia?.toFixed(1)}%, acima do limite de ${dados.limite}%. Total de ${dados.titulos_vencidos} títulos vencidos somando R$ ${dados.valor_total?.toFixed(2)}.`,
    },
    fluxo_negativo: {
      titulo: 'Fluxo de Caixa Negativo Projetado',
      mensagem: `Projeção de saldo negativo em ${dados.dias_projecao} dias: R$ ${dados.saldo_projetado?.toFixed(2)}.`,
    },
    contas_vencendo: {
      titulo: `${dados.quantidade} Contas Vencendo`,
      mensagem: `${dados.quantidade} conta(s) vencendo em ${dados.dias_antecedencia} dias, totalizando R$ ${dados.valor_total?.toFixed(2)}.`,
    },
    taxa_divergente: {
      titulo: 'Taxas Bancárias Divergentes',
      mensagem: `${dados.quantidade} transação(ões) com taxa divergente, total de divergência: R$ ${dados.total_divergencia?.toFixed(2)}.`,
    },
    conciliacao_pendente: {
      titulo: 'Conciliação Bancária Pendente',
      mensagem: `${dados.quantidade} reconciliação(ões) pendente(s) há mais de ${dados.dias_maximo} dias.`,
    },
    faturamento_baixo: {
      titulo: 'Faturamento Abaixo da Meta',
      mensagem: `Faturamento atual de R$ ${dados.receita_atual?.toFixed(2)} está em ${dados.percentual_atingido}% da meta mensal de R$ ${dados.meta_mensal?.toFixed(2)}.`,
    },
    margem_baixa: {
      titulo: 'Margem de Lucro Baixa',
      mensagem: `Margem de lucro atual em ${dados.margem_atual?.toFixed(1)}%, abaixo do mínimo de ${dados.margem_minima}%.`,
    },
  };

  return textos[dados.tipo] || {
    titulo: rule.nome,
    mensagem: 'Alerta gerado pelo sistema',
  };
}

/**
 * Envia notificações para o alerta
 */
async function enviarNotificacoes(supabase: any, alert: any, rule: any) {
  try {
    // WhatsApp
    if (rule.notify_whatsapp) {
      await supabase.functions.invoke('send-alert-whatsapp', {
        body: {
          alert_id: alert.id,
          alert_rule_id: rule.id,
          formato: rule.formato_mensagem || 'detalhado',
        },
      });
    }

    // Email (implementar depois)
    if (rule.notify_email) {
      // TODO: Implementar envio de email
      console.log('📧 Email notification (TODO)');
    }

    // Sistema (já está criado no banco)
    console.log('✅ Notificações enviadas');
  } catch (err) {
    console.error('❌ Erro ao enviar notificações:', err);
  }
}

