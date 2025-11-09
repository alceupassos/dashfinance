import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface CommandRequest {
  phone_number: string;
  company_cnpj: string;
  command: string; // e.g., "/saldo", "/dre 10"
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

function onlyDigits(text: string): string {
  return text.replace(/[^0-9]/g, '');
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

// ========================================
// COMMAND HANDLERS
// ========================================

async function handleSaldoCommand(cnpj: string): Promise<string> {
  const supabase = getSupabaseClient();
  const cleanCnpj = onlyDigits(cnpj);

  // Get latest cards
  const { data: cards } = await supabase
    .from('v_dashboard_cards_valid')
    .select('card_key, value, formatted, metadata')
    .eq('company_cnpj', cleanCnpj)
    .in('card_key', ['total_caixa', 'caixa_disponivel'])
    .order('calculated_at', { ascending: false })
    .limit(2);

  if (!cards || cards.length === 0) {
    return '⚠️ Não foi possível obter o saldo. Dados ainda não sincronizados.';
  }

  const totalCaixa = cards.find(c => c.card_key === 'total_caixa');
  const disponivel = cards.find(c => c.card_key === 'caixa_disponivel');

  const bloqueado = (totalCaixa?.value || 0) - (disponivel?.value || 0);

  let response = '💰 *Saldo Atual*\n\n';
  response += `Total em Caixa: ${totalCaixa?.formatted || 'N/A'}\n`;
  response += `✅ Disponível: ${disponivel?.formatted || 'N/A'}\n`;
  if (bloqueado > 0) {
    response += `🔒 Bloqueado: ${formatCurrency(bloqueado)}\n`;
  }

  // Get bank accounts
  const { data: banks } = await supabase
    .from('bank_accounts')
    .select('bank_name, balance')
    .eq('company_cnpj', cleanCnpj)
    .eq('is_active', true);

  if (banks && banks.length > 0) {
    response += '\n*Bancos:*\n';
    banks.forEach(bank => {
      response += `• ${bank.bank_name}: ${formatCurrency(bank.balance)}\n`;
    });
  }

  response += `\n_Atualizado em: ${new Date().toLocaleString('pt-BR')}_`;

  return response;
}

async function handleDreCommand(cnpj: string, month?: number): Promise<string> {
  const supabase = getSupabaseClient();
  const cleanCnpj = onlyDigits(cnpj);

  const targetMonth = month || new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  const monthName = new Date(year, targetMonth - 1).toLocaleString('pt-BR', { month: 'long' });

  // Get DRE from v_kpi_monthly_enriched
  const { data: kpi } = await supabase
    .from('v_kpi_monthly_enriched')
    .select('*')
    .eq('company_cnpj', cleanCnpj)
    .eq('month', targetMonth)
    .eq('year', year)
    .single();

  if (!kpi) {
    return `⚠️ DRE de ${monthName}/${year} ainda não disponível.`;
  }

  let response = `📊 *DRE - ${monthName}/${year}*\n\n`;

  response += `Receita Líquida: ${formatCurrency(kpi.receita_liquida || 0)}\n`;
  response += `(-) CMV: ${formatCurrency(kpi.cmv || 0)} (${formatPercent(kpi.cmv_percent || 0)})\n`;
  response += `= Lucro Bruto: ${formatCurrency(kpi.lucro_bruto || 0)} (${formatPercent(kpi.margem_bruta || 0)})\n\n`;

  response += `(-) *Despesas Operacionais*\n`;
  response += `  • Vendas: ${formatCurrency(kpi.despesas_vendas || 0)}\n`;
  response += `  • Administrativas: ${formatCurrency(kpi.despesas_admin || 0)}\n`;
  response += `  • Financeiras: ${formatCurrency(kpi.despesas_financeiras || 0)}\n`;
  response += `= EBITDA: ${formatCurrency(kpi.ebitda || 0)} (${formatPercent(kpi.margem_ebitda || 0)})\n\n`;

  response += `(-) Deprec./Amort.: ${formatCurrency(kpi.depreciacao || 0)}\n`;
  response += `= EBIT: ${formatCurrency(kpi.ebit || 0)}\n\n`;

  response += `(-) IR/CSLL: ${formatCurrency(kpi.impostos || 0)}\n`;
  response += `= *Lucro Líquido: ${formatCurrency(kpi.lucro_liquido || 0)} (${formatPercent(kpi.margem_liquida || 0)})*\n\n`;

  // Analysis
  if (kpi.margem_liquida >= 20) {
    response += '✅ Margem excelente! Empresa muito rentável.\n';
  } else if (kpi.margem_liquida >= 10) {
    response += '🟢 Margem saudável. Continue assim!\n';
  } else if (kpi.margem_liquida >= 5) {
    response += '🟡 Margem moderada. Busque melhorias.\n';
  } else {
    response += '🔴 Margem baixa. Atenção urgente necessária!\n';
  }

  response += '\nQuer análise detalhada? Digite: `/analise`';

  return response;
}

async function handleFluxoCommand(cnpj: string): Promise<string> {
  const supabase = getSupabaseClient();
  const cleanCnpj = onlyDigits(cnpj);

  // Get cashflow projection
  const { data: projection } = await supabase
    .from('v_cashflow_projection_30d')
    .select('*')
    .eq('company_cnpj', cleanCnpj)
    .single();

  if (!projection) {
    return '⚠️ Projeção de fluxo de caixa ainda não disponível.';
  }

  let response = '💸 *Fluxo de Caixa - Próximos 30 Dias*\n\n';

  response += `Saldo Inicial: ${formatCurrency(projection.saldo_inicial)}\n\n`;

  response += `📈 *Entradas Previstas*\n`;
  response += `  • Receitas: ${formatCurrency(projection.receitas_previstas)}\n`;
  response += `  • Recebíveis: ${formatCurrency(projection.recebiveis)}\n`;
  response += `  Total: ${formatCurrency(projection.total_entradas)}\n\n`;

  response += `📉 *Saídas Previstas*\n`;
  response += `  • Despesas Fixas: ${formatCurrency(projection.despesas_fixas)}\n`;
  response += `  • Despesas Variáveis: ${formatCurrency(projection.despesas_variaveis)}\n`;
  response += `  • Contas a Pagar: ${formatCurrency(projection.contas_pagar)}\n`;
  response += `  Total: ${formatCurrency(projection.total_saidas)}\n\n`;

  const resultado = projection.total_entradas - projection.total_saidas;
  const saldoFinal = projection.saldo_inicial + resultado;

  response += `= *Resultado: ${formatCurrency(resultado)}*\n`;
  response += `💰 *Saldo Final: ${formatCurrency(saldoFinal)}*\n\n`;

  if (saldoFinal < 0) {
    response += '🔴 *ALERTA:* Fluxo negativo! Ação urgente necessária.\n';
  } else if (saldoFinal < projection.saldo_inicial * 0.5) {
    response += '🟡 *ATENÇÃO:* Saldo cairá significativamente.\n';
  } else {
    response += '🟢 Fluxo saudável.\n';
  }

  response += '\nVer gráfico completo: `/projecao`';

  return response;
}

async function handlePagarCommand(cnpj: string): Promise<string> {
  const supabase = getSupabaseClient();
  const cleanCnpj = onlyDigits(cnpj);

  const today = new Date();
  const next7days = new Date(today);
  next7days.setDate(today.getDate() + 7);

  const { data: contas } = await supabase
    .from('contas_pagar')
    .select('*')
    .eq('company_cnpj', cleanCnpj)
    .eq('status', 'pendente')
    .gte('vencimento', today.toISOString().split('T')[0])
    .lte('vencimento', next7days.toISOString().split('T')[0])
    .order('vencimento', { ascending: true });

  if (!contas || contas.length === 0) {
    return '✅ Nenhuma conta a pagar vencendo nos próximos 7 dias.';
  }

  let response = `📋 *Contas a Pagar - Próximos 7 Dias*\n`;
  response += `Total: ${contas.length} conta${contas.length > 1 ? 's' : ''}\n\n`;

  const total = contas.reduce((sum, c) => sum + c.valor, 0);

  contas.slice(0, 10).forEach((conta, i) => {
    const venc = new Date(conta.vencimento);
    const dias = Math.ceil((venc.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let emoji = '🟢';
    if (dias <= 1) emoji = '🔴';
    else if (dias <= 3) emoji = '🟡';

    response += `${emoji} ${conta.descricao}\n`;
    response += `   ${formatCurrency(conta.valor)} - Vence em ${dias} dia${dias !== 1 ? 's' : ''}\n\n`;
  });

  if (contas.length > 10) {
    response += `_...e mais ${contas.length - 10} contas_\n\n`;
  }

  response += `💰 *Total: ${formatCurrency(total)}*\n\n`;
  response += 'Ver todas: acesse o dashboard iFinance';

  return response;
}

async function handleAlertaCommand(cnpj: string): Promise<string> {
  const supabase = getSupabaseClient();
  const cleanCnpj = onlyDigits(cnpj);

  // Get active alerts
  const { data: alerts } = await supabase
    .from('financial_alerts')
    .select('*')
    .eq('company_cnpj', cleanCnpj)
    .eq('status', 'active')
    .order('severity', { ascending: false })
    .order('created_at', { ascending: false });

  if (!alerts || alerts.length === 0) {
    return '✅ Nenhum alerta ativo no momento. Tudo em ordem!';
  }

  let response = `⚠️ *Alertas Ativos - ${alerts.length} ite${alerts.length > 1 ? 'ns' : 'm'}*\n\n`;

  const critical = alerts.filter(a => a.severity === 'critical');
  const warning = alerts.filter(a => a.severity === 'warning');
  const info = alerts.filter(a => a.severity === 'info');

  if (critical.length > 0) {
    response += `🔴 *CRÍTICO* (${critical.length})\n`;
    critical.slice(0, 3).forEach(alert => {
      response += `• ${alert.message}\n`;
      if (alert.action) response += `  _Ação: ${alert.action}_\n`;
    });
    response += '\n';
  }

  if (warning.length > 0) {
    response += `🟡 *ATENÇÃO* (${warning.length})\n`;
    warning.slice(0, 3).forEach(alert => {
      response += `• ${alert.message}\n`;
    });
    response += '\n';
  }

  if (info.length > 0) {
    response += `ℹ️ *INFORMATIVO* (${info.length})\n`;
    info.slice(0, 2).forEach(alert => {
      response += `• ${alert.message}\n`;
    });
  }

  return response;
}

async function handleAjudaCommand(): Promise<string> {
  let response = '📱 *Comandos iFinance*\n\n';

  response += '*💰 Financeiro*\n';
  response += '`/saldo` - Saldo atual\n';
  response += '`/dre` - DRE do mês\n';
  response += '`/fluxo` - Fluxo de caixa 30d\n';
  response += '`/pagar` - Contas a pagar\n';
  response += '`/receber` - Contas a receber\n\n';

  response += '*📊 Relatórios*\n';
  response += '`/relatorio` - Relatório executivo\n';
  response += '`/kpis` - KPIs principais\n';
  response += '`/analise` - Análise com IA\n';
  response += '`/alerta` - Ver alertas ativos\n\n';

  response += '*📈 Projeções*\n';
  response += '`/projecao` - Projeção 30 dias\n';
  response += '`/runway` - Runway da empresa\n\n';

  response += '*⚙️ Configuração*\n';
  response += '`/vincular` - Vincular WhatsApp\n';
  response += '`/perfil` - Meu perfil\n';
  response += '`/empresas` - Listar empresas\n\n';

  response += 'Dúvidas? Visite: https://ifin.app.br/ajuda';

  return response;
}

async function handleVincularCommand(phoneNumber: string): Promise<string> {
  // Generate validation code
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();

  // Store in temporary validation table
  const supabase = getSupabaseClient();
  await supabase.from('whatsapp_validation_codes').insert({
    phone_number: phoneNumber,
    code: code,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min
  });

  let response = '🔗 *Vincular WhatsApp ao iFinance*\n\n';
  response += 'Para sua segurança, envie:\n';
  response += '1. CNPJ da empresa (14 dígitos)\n';
  response += '2. Código de validação\n\n';
  response += `📧 Código enviado para seu email: *${code}*\n\n`;
  response += 'Exemplo:\n';
  response += '`12345678000190`\n';
  response += `\`${code}\`\n\n`;
  response += '⏳ Código válido por 15 minutos.';

  return response;
}

async function handlePerfilCommand(cnpj: string, phoneNumber: string): Promise<string> {
  const supabase = getSupabaseClient();
  const cleanCnpj = onlyDigits(cnpj);

  // Get session
  const { data: session } = await supabase
    .from('whatsapp_chat_sessions')
    .select('*')
    .eq('phone_number', phoneNumber)
    .eq('company_cnpj', cleanCnpj)
    .single();

  // Get company
  const { data: company } = await supabase
    .from('clientes')
    .select('razao_social, cnpj')
    .eq('cnpj', cleanCnpj)
    .single();

  // Get user
  const { data: user } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('phone', phoneNumber)
    .single();

  let response = '👤 *Meu Perfil*\n\n';

  if (user) {
    response += `Nome: ${user.full_name}\n`;
    response += `Email: ${user.email}\n`;
    response += `Cargo: ${user.role}\n\n`;
  }

  if (company) {
    response += `Empresa: ${company.razao_social}\n`;
    response += `CNPJ: ${company.cnpj}\n\n`;
  }

  if (session) {
    response += `Status: ${session.session_state === 'active' ? '🟢 Ativo' : '🔴 Inativo'}\n`;
    response += `Vinculado em: ${new Date(session.created_at).toLocaleDateString('pt-BR')}\n`;
  }

  return response;
}

// ========================================
// MAIN HANDLER
// ========================================

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const { phone_number, company_cnpj, command }: CommandRequest = await req.json();

    if (!phone_number || !command) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📱 Command received: ${command} from ${phone_number}`);

    // Parse command
    const [cmd, ...args] = command.trim().split(/\s+/);
    let response: string;

    // Route to appropriate handler
    switch (cmd.toLowerCase()) {
      case '/saldo':
        response = await handleSaldoCommand(company_cnpj);
        break;

      case '/dre':
        const month = args[0] ? parseInt(args[0]) : undefined;
        response = await handleDreCommand(company_cnpj, month);
        break;

      case '/fluxo':
        response = await handleFluxoCommand(company_cnpj);
        break;

      case '/pagar':
        response = await handlePagarCommand(company_cnpj);
        break;

      case '/alerta':
        response = await handleAlertaCommand(company_cnpj);
        break;

      case '/ajuda':
      case '/help':
        response = await handleAjudaCommand();
        break;

      case '/vincular':
        response = await handleVincularCommand(phone_number);
        break;

      case '/perfil':
        response = await handlePerfilCommand(company_cnpj, phone_number);
        break;

      default:
        response = `❓ Comando não reconhecido: ${cmd}\n\nDigite \`/ajuda\` para ver comandos disponíveis.`;
    }

    return new Response(
      JSON.stringify({ response }),
      { status: 200, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in whatsapp-admin-commands:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    );
  }
});
