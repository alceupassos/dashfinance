import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseKey);
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

interface ContractFee {
  id: string;
  company_cnpj: string;
  tipo: string;
  taxa_percentual: number;
  taxa_fixa: number;
  banco_codigo: string;
  operadora: string;
  bandeira: string;
  vigencia_inicio: string;
  vigencia_fim: string;
}

interface BankStatement {
  id: string;
  company_cnpj: string;
  banco_codigo: string;
  data_movimento: string;
  tipo: string;
  valor: number;
  descricao: string;
  documento: string;
}

// ========================================
// VALIDAÇÃO DE TAXAS
// ========================================
async function validateFees() {
  const supabase = getSupabaseClient();
  const results = {
    validations: 0,
    divergences: 0,
    alerts: 0,
    errors: [] as string[],
  };

  console.log('[ValidateFees] Starting fee validation...');

  // Buscar extratos dos últimos 7 dias ainda não validados
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - 7);

  const { data: statements, error: stmtError } = await supabase
    .from('bank_statements')
    .select('*')
    .gte('data_movimento', dataLimite.toISOString().split('T')[0])
    .order('data_movimento', { ascending: false });

  if (stmtError) {
    console.error('[ValidateFees] Error fetching statements:', stmtError);
    results.errors.push(`Error fetching statements: ${stmtError.message}`);
    return results;
  }

  console.log(`[ValidateFees] Found ${statements?.length || 0} statements to validate`);

  for (const stmt of statements || []) {
    try {
      await validateStatement(stmt, results);
    } catch (error) {
      console.error(`[ValidateFees] Error validating statement ${stmt.id}:`, error);
      results.errors.push(`Statement ${stmt.id}: ${error.message}`);
    }
  }

  console.log('[ValidateFees] Validation completed:', results);
  return results;
}

async function validateStatement(stmt: BankStatement, results: any) {
  const supabase = getSupabaseClient();

  // Identificar tipo de operação pela descrição
  const tipoOperacao = identificarTipoOperacao(stmt.descricao);
  
  if (!tipoOperacao) {
    // Não é uma operação com taxa
    return;
  }

  results.validations++;

  // Buscar taxa contratual vigente
  const { data: contractFees } = await supabase
    .from('contract_fees')
    .select('*')
    .eq('company_cnpj', stmt.company_cnpj)
    .eq('tipo', tipoOperacao)
    .eq('ativo', true)
    .lte('vigencia_inicio', stmt.data_movimento)
    .or(`vigencia_fim.is.null,vigencia_fim.gte.${stmt.data_movimento}`)
    .limit(1)
    .single();

  if (!contractFees) {
    console.warn(`[ValidateFees] No contract fee found for ${stmt.company_cnpj} - ${tipoOperacao}`);
    return;
  }

  // Calcular taxa esperada
  const taxaEsperada = calcularTaxaEsperada(contractFees, Math.abs(stmt.valor));
  
  // Taxa cobrada é o valor do lançamento (geralmente negativo)
  const taxaCobrada = Math.abs(stmt.valor);

  // Calcular diferença
  const diferenca = taxaCobrada - taxaEsperada;
  const percentualDiferenca = taxaEsperada > 0 ? (diferenca / taxaEsperada) * 100 : 0;

  // Determinar status (tolerância de 2%)
  const status = Math.abs(percentualDiferenca) > 2 ? 'divergente' : 'ok';

  // Salvar validação
  const { data: validation, error: valError } = await supabase
    .from('fee_validations')
    .insert({
      company_cnpj: stmt.company_cnpj,
      tipo_operacao: tipoOperacao,
      bank_statement_id: stmt.id,
      contract_fee_id: contractFees.id,
      data_operacao: stmt.data_movimento,
      valor_operacao: Math.abs(stmt.valor),
      taxa_esperada: taxaEsperada,
      taxa_cobrada: taxaCobrada,
      diferenca: diferenca,
      percentual_diferenca: percentualDiferenca,
      status: status,
      documento: stmt.documento,
      banco_codigo: stmt.banco_codigo,
    })
    .select()
    .single();

  if (valError) {
    console.error('[ValidateFees] Error saving validation:', valError);
    return;
  }

  // Se há divergência, criar alerta
  if (status === 'divergente') {
    results.divergences++;
    await criarAlertaTaxaDivergente(stmt, contractFees, validation);
    results.alerts++;
  }
}

function identificarTipoOperacao(descricao: string): string | null {
  const desc = descricao.toLowerCase();

  if (desc.includes('boleto') && (desc.includes('emissao') || desc.includes('emissão'))) {
    return 'boleto_emissao';
  }
  if (desc.includes('boleto') && (desc.includes('receb') || desc.includes('cobranca') || desc.includes('cobrança'))) {
    return 'boleto_recebimento';
  }
  if (desc.includes('ted')) {
    return 'ted';
  }
  if (desc.includes('pix')) {
    return 'pix';
  }
  if (desc.includes('cartao') || desc.includes('cartão')) {
    if (desc.includes('credito') || desc.includes('crédito')) {
      return 'cartao_credito';
    }
    if (desc.includes('debito') || desc.includes('débito')) {
      return 'cartao_debito';
    }
  }
  if (desc.includes('tarifa') || desc.includes('manutencao') || desc.includes('manutenção')) {
    return 'tarifa_manutencao';
  }

  return null;
}

function calcularTaxaEsperada(contractFee: ContractFee, valorOperacao: number): number {
  let taxa = 0;

  if (contractFee.taxa_fixa) {
    taxa += contractFee.taxa_fixa;
  }

  if (contractFee.taxa_percentual) {
    taxa += valorOperacao * (contractFee.taxa_percentual / 100);
  }

  return taxa;
}

async function criarAlertaTaxaDivergente(
  stmt: BankStatement,
  contractFee: ContractFee,
  validation: any
) {
  const supabase = getSupabaseClient();

  const titulo = `Taxa ${formatarTipoOperacao(validation.tipo_operacao)} divergente`;
  
  const mensagem = `
🚨 ALERTA: Taxa cobrada incorretamente

Tipo: ${formatarTipoOperacao(validation.tipo_operacao)}
Título/Documento: ${stmt.documento || 'N/A'}
Data: ${formatarData(stmt.data_movimento)}

💰 Valores:
Taxa Contratada: R$ ${validation.taxa_esperada.toFixed(2)}
Taxa Cobrada: R$ ${validation.taxa_cobrada.toFixed(2)}
Diferença: R$ ${validation.diferenca.toFixed(2)} ${validation.diferenca > 0 ? 'a MAIS' : 'a MENOS'}
Percentual: ${Math.abs(validation.percentual_diferenca).toFixed(1)}%

🏦 Banco: ${stmt.banco_codigo}

✅ AÇÃO NECESSÁRIA:
Entre em contato com o banco para contestar a cobrança incorreta.
Solicite protocolo de atendimento para acompanhamento.
  `.trim();

  const dadosDetalhados = {
    tipo_operacao: validation.tipo_operacao,
    documento: stmt.documento,
    data_operacao: stmt.data_movimento,
    taxa_esperada: validation.taxa_esperada,
    taxa_cobrada: validation.taxa_cobrada,
    diferenca: validation.diferenca,
    percentual_diferenca: validation.percentual_diferenca,
    banco_codigo: stmt.banco_codigo,
    operadora: contractFee.operadora,
    bandeira: contractFee.bandeira,
    bank_statement_id: stmt.id,
    contract_fee_id: contractFee.id,
  };

  // Determinar prioridade baseada na diferença
  let prioridade = 'media';
  const difAbs = Math.abs(validation.diferenca);
  if (difAbs > 100) prioridade = 'critica';
  else if (difAbs > 50) prioridade = 'alta';
  else if (difAbs > 10) prioridade = 'media';
  else prioridade = 'baixa';

  const { data: alert, error: alertError } = await supabase
    .from('financial_alerts')
    .insert({
      company_cnpj: stmt.company_cnpj,
      tipo_alerta: 'taxa_divergente',
      prioridade,
      titulo,
      mensagem,
      dados_detalhados: dadosDetalhados,
      fee_validation_id: validation.id,
      bank_statement_id: stmt.id,
    })
    .select()
    .single();

  if (alertError) {
    console.error('[ValidateFees] Error creating alert:', alertError);
    return;
  }

  console.log(`[ValidateFees] Alert created: ${alert.id} - ${titulo}`);

  // Notificar via WhatsApp
  await notificarWhatsApp(alert);
}

async function notificarWhatsApp(alert: any) {
  const supabase = getSupabaseClient();

  try {
    // Buscar código WhatsApp do cliente
    const { data: client } = await supabase
      .from('clients')
      .select('codigo_whatsapp, razao_social')
      .eq('cnpj', alert.company_cnpj)
      .single();

    if (!client || !client.codigo_whatsapp) {
      console.warn(`[ValidateFees] No WhatsApp code for CNPJ ${alert.company_cnpj}`);
      return;
    }

    // Formatar mensagem para WhatsApp
    const mensagemWhatsApp = `
🔔 *ALERTA FINANCEIRO - ${client.razao_social}*

${alert.mensagem}

_Para mais detalhes, acesse o sistema._
_Ref: ALT-${alert.id.substring(0, 8)}_
    `.trim();

    // Chamar função de envio de WhatsApp
    const { error: whatsappError } = await supabase.functions.invoke('wasender-send-message', {
      body: {
        phoneNumber: client.codigo_whatsapp,
        message: mensagemWhatsApp,
      },
    });

    if (whatsappError) {
      console.error('[ValidateFees] Error sending WhatsApp:', whatsappError);
      return;
    }

    // Marcar como notificado
    await supabase
      .from('financial_alerts')
      .update({
        notificado_whatsapp: true,
        notificado_whatsapp_em: new Date().toISOString(),
      })
      .eq('id', alert.id);

    console.log(`[ValidateFees] WhatsApp notification sent for alert ${alert.id}`);
  } catch (error) {
    console.error('[ValidateFees] Error in WhatsApp notification:', error);
  }
}

function formatarTipoOperacao(tipo: string): string {
  const map: Record<string, string> = {
    'boleto_emissao': 'Emissão de Boleto',
    'boleto_recebimento': 'Recebimento de Boleto',
    'ted': 'TED',
    'pix': 'PIX',
    'cartao_credito': 'Cartão de Crédito',
    'cartao_debito': 'Cartão de Débito',
    'tarifa_manutencao': 'Tarifa de Manutenção',
  };
  return map[tipo] || tipo;
}

function formatarData(data: string): string {
  const d = new Date(data + 'T00:00:00');
  return d.toLocaleDateString('pt-BR');
}

// ========================================
// HANDLER PRINCIPAL
// ========================================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const results = await validateFees();

    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[ValidateFees] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      }
    );
  }
});

