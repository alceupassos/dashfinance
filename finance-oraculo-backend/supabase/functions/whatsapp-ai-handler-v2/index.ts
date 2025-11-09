// =====================================================
// WHATSAPP AI HANDLER V2 - COM CONSULTA AOS ERPS
// =====================================================
// Processa mensagens do WhatsApp e consulta F360/Omie
// em tempo real para responder com dados atualizados

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppMessage {
  from: string;
  text: string;
  timestamp: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message } = await req.json() as { message: WhatsAppMessage };

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`💬 Mensagem recebida de: ${message.from}`);
    console.log(`📝 Conteúdo: ${message.text}`);

    // Identificar usuário e suas empresas
    const { data: user, error: userError } = await supabase
      .from('onboarding_tokens')
      .select(`
        *,
        integration_f360 (
          token_enc,
          base_url,
          company_cnpj
        )
      `)
      .eq('activated_by_phone', message.from)
      .eq('status', 'activated')
      .single();

    if (userError || !user) {
      console.error('❌ Usuário não encontrado:', userError);
      await sendWhatsApp(message.from, '⚠️ Seu token não está ativado. Por favor, envie seu token primeiro.');
      return new Response(JSON.stringify({ success: false, error: 'Usuário não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Usuário identificado: ${user.user_name || message.from}`);
    console.log(`🏢 Token F360: ${user.f360_token?.substring(0, 8)}...`);

    // Processar comando
    const command = detectCommand(message.text);
    let responseText = '';

    switch (command.type) {
      case 'saldo':
      case 'balance':
        responseText = await handleBalanceQuery(user, supabase);
        break;

      case 'alertas':
      case 'alerts':
        responseText = await handleAlertsQuery(user, supabase);
        break;

      case 'dre':
      case 'report':
        responseText = await handleDREQuery(user, supabase, command.params);
        break;

      case 'receber':
      case 'receivables':
        responseText = await handleReceivablesQuery(user, supabase);
        break;

      case 'pagar':
      case 'payables':
        responseText = await handlePayablesQuery(user, supabase);
        break;

      case 'overview':
      case 'resumo':
        responseText = await handleOverviewQuery(user, supabase);
        break;

      default:
        // Usar Claude Haiku 3.5 para resposta inteligente
        responseText = await handleIntelligentQuery(user, message.text, supabase);
        break;
    }

    // Enviar resposta
    await sendWhatsApp(message.from, responseText);

    // Registrar interação
    await supabase.from('whatsapp_messages').insert({
      phone_number: message.from,
      message_type: 'inbound',
      content: message.text,
      processed: true,
      response: responseText,
    });

    return new Response(
      JSON.stringify({ success: true, response: responseText }),
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
// DETECÇÃO DE COMANDO
// =====================================================

function detectCommand(text: string) {
  const lower = text.toLowerCase().trim();

  if (/^[12]$/.test(lower) || /saldo|balanço|balance/.test(lower)) {
    return { type: 'saldo', params: {} };
  }

  if (/^1$/.test(lower) || /alerta|pendência|alert/.test(lower)) {
    return { type: 'alertas', params: {} };
  }

  if (/^3$/.test(lower) || /dre|demonstra|resultado/.test(lower)) {
    return { type: 'dre', params: {} };
  }

  if (/receb|receivable|a\s*receber/.test(lower)) {
    return { type: 'receber', params: {} };
  }

  if (/pag|payable|a\s*pagar/.test(lower)) {
    return { type: 'pagar', params: {} };
  }

  if (/resumo|overview|visão\s*geral|geral/.test(lower)) {
    return { type: 'overview', params: {} };
  }

  return { type: 'intelligent', params: { query: text } };
}

// =====================================================
// HANDLERS DE CONSULTA
// =====================================================

async function handleBalanceQuery(user: any, supabase: any): Promise<string> {
  console.log('💰 Consultando saldo no F360...');

  try {
    // Chamar Edge Function de consulta F360
    const { data, error } = await supabase.functions.invoke('fetch-f360-realtime', {
      body: { f360_token: user.f360_token, query_type: 'balance' }
    });

    if (error) {
      console.error('❌ Erro ao consultar F360:', error);
      return '⚠️ Não foi possível consultar o saldo no momento. Tente novamente em instantes.';
    }

    const balance = data.data;
    
    let msg = '💰 *SALDO GRUPO VOLPE*\n\n';
    msg += `💵 *Saldo Total:* R$ ${formatCurrency(balance.total_balance)}\n`;
    msg += `✅ *Disponível:* R$ ${formatCurrency(balance.available_balance)}\n`;
    msg += `🔒 *Bloqueado:* R$ ${formatCurrency(balance.blocked_balance)}\n\n`;

    if (balance.accounts && balance.accounts.length > 0) {
      msg += '🏦 *Por Conta:*\n';
      balance.accounts.forEach((acc: any) => {
        msg += `• ${acc.name}: R$ ${formatCurrency(acc.balance)}\n`;
      });
    }

    msg += `\n_Atualizado em: ${new Date().toLocaleString('pt-BR')}_`;

    return msg;

  } catch (error) {
    console.error('❌ Erro:', error);
    return '⚠️ Erro ao consultar saldo. Tente novamente.';
  }
}

async function handleAlertsQuery(user: any, supabase: any): Promise<string> {
  console.log('🚨 Consultando alertas...');

  try {
    const { data: alerts, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('company_cnpj', user.integration_f360.company_cnpj)
      .eq('status', 'active')
      .order('prioridade', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    if (!alerts || alerts.length === 0) {
      return '✅ *PARABÉNS!*\n\nNenhum alerta ativo no momento.\nTodas as suas empresas estão em dia! 🎉';
    }

    let msg = '🚨 *ALERTAS ATIVOS*\n\n';
    msg += `Total: ${alerts.length} alerta(s)\n\n`;

    alerts.slice(0, 5).forEach((alert: any, i: number) => {
      const emoji = getPriorityEmoji(alert.prioridade);
      msg += `${i + 1}. ${emoji} *${alert.titulo}*\n`;
      msg += `   ${alert.mensagem}\n`;
      msg += `   _${formatDate(alert.created_at)}_\n\n`;
    });

    if (alerts.length > 5) {
      msg += `_...e mais ${alerts.length - 5} alerta(s)_\n\n`;
    }

    msg += '_Acesse o sistema para ver detalhes completos._';

    return msg;

  } catch (error) {
    console.error('❌ Erro:', error);
    return '⚠️ Erro ao consultar alertas. Tente novamente.';
  }
}

async function handleDREQuery(user: any, supabase: any, params: any): Promise<string> {
  console.log('📊 Consultando DRE no F360...');

  try {
    const { data, error } = await supabase.functions.invoke('fetch-f360-realtime', {
      body: { 
        f360_token: user.f360_token, 
        query_type: 'dre',
        date_start: params.date_start,
        date_end: params.date_end
      }
    });

    if (error) {
      console.error('❌ Erro ao consultar F360:', error);
      return '⚠️ Não foi possível consultar o DRE no momento.';
    }

    const dre = data.data;
    
    let msg = '📊 *DRE - GRUPO VOLPE*\n\n';
    msg += `📅 Período: ${formatDate(dre.date_start)} a ${formatDate(dre.date_end)}\n\n`;
    msg += `💰 *Receita Bruta:* R$ ${formatCurrency(dre.receita_bruta || 0)}\n`;
    msg += `📉 *Deduções:* R$ ${formatCurrency(dre.deducoes || 0)}\n`;
    msg += `💵 *Receita Líquida:* R$ ${formatCurrency(dre.receita_liquida || 0)}\n\n`;
    msg += `💸 *Custos:* R$ ${formatCurrency(dre.custos || 0)}\n`;
    msg += `📊 *Lucro Bruto:* R$ ${formatCurrency(dre.lucro_bruto || 0)}\n\n`;
    msg += `🏢 *Despesas Operacionais:* R$ ${formatCurrency(dre.despesas_operacionais || 0)}\n`;
    msg += `💎 *EBITDA:* R$ ${formatCurrency(dre.ebitda || 0)}\n`;
    msg += `✅ *Lucro Líquido:* R$ ${formatCurrency(dre.lucro_liquido || 0)}\n\n`;

    const margem = dre.receita_liquida > 0 ? (dre.lucro_liquido / dre.receita_liquida * 100).toFixed(2) : 0;
    msg += `📈 *Margem Líquida:* ${margem}%\n\n`;
    msg += `_Atualizado em: ${new Date().toLocaleString('pt-BR')}_`;

    return msg;

  } catch (error) {
    console.error('❌ Erro:', error);
    return '⚠️ Erro ao consultar DRE. Tente novamente.';
  }
}

async function handleReceivablesQuery(user: any, supabase: any): Promise<string> {
  console.log('📥 Consultando contas a receber...');

  try {
    const { data, error } = await supabase.functions.invoke('fetch-f360-realtime', {
      body: { f360_token: user.f360_token, query_type: 'receivables' }
    });

    if (error) throw error;

    const receivables = data.data;
    
    let msg = '📥 *CONTAS A RECEBER*\n\n';
    msg += `💰 *Total:* R$ ${formatCurrency(receivables.total)}\n`;
    msg += `📋 *Quantidade:* ${receivables.count} título(s)\n\n`;
    
    if (receivables.overdue > 0) {
      msg += `⚠️ *VENCIDOS*\n`;
      msg += `💸 Valor: R$ ${formatCurrency(receivables.overdue)}\n`;
      msg += `📋 Quantidade: ${receivables.overdue_count} título(s)\n\n`;
    }

    msg += `_Atualizado em: ${new Date().toLocaleString('pt-BR')}_`;

    return msg;

  } catch (error) {
    console.error('❌ Erro:', error);
    return '⚠️ Erro ao consultar contas a receber.';
  }
}

async function handlePayablesQuery(user: any, supabase: any): Promise<string> {
  console.log('📤 Consultando contas a pagar...');

  try {
    const { data, error } = await supabase.functions.invoke('fetch-f360-realtime', {
      body: { f360_token: user.f360_token, query_type: 'payables' }
    });

    if (error) throw error;

    const payables = data.data;
    
    let msg = '📤 *CONTAS A PAGAR*\n\n';
    msg += `💸 *Total:* R$ ${formatCurrency(payables.total)}\n`;
    msg += `📋 *Quantidade:* ${payables.count} título(s)\n\n`;
    
    if (payables.overdue > 0) {
      msg += `⚠️ *VENCIDOS*\n`;
      msg += `💰 Valor: R$ ${formatCurrency(payables.overdue)}\n`;
      msg += `📋 Quantidade: ${payables.overdue_count} título(s)\n\n`;
    }

    msg += `_Atualizado em: ${new Date().toLocaleString('pt-BR')}_`;

    return msg;

  } catch (error) {
    console.error('❌ Erro:', error);
    return '⚠️ Erro ao consultar contas a pagar.';
  }
}

async function handleOverviewQuery(user: any, supabase: any): Promise<string> {
  console.log('📈 Consultando visão geral...');

  try {
    const { data, error } = await supabase.functions.invoke('fetch-f360-realtime', {
      body: { f360_token: user.f360_token, query_type: 'overview' }
    });

    if (error) throw error;

    const overview = data.data;
    
    let msg = '📈 *VISÃO GERAL - GRUPO VOLPE*\n\n';
    
    msg += '💰 *SALDO*\n';
    msg += `Disponível: R$ ${formatCurrency(overview.balance.available_balance)}\n\n`;
    
    msg += '📥 *A RECEBER*\n';
    msg += `Total: R$ ${formatCurrency(overview.receivables.total)}\n`;
    if (overview.receivables.overdue > 0) {
      msg += `⚠️ Vencido: R$ ${formatCurrency(overview.receivables.overdue)}\n`;
    }
    msg += '\n';
    
    msg += '📤 *A PAGAR*\n';
    msg += `Total: R$ ${formatCurrency(overview.payables.total)}\n`;
    if (overview.payables.overdue > 0) {
      msg += `⚠️ Vencido: R$ ${formatCurrency(overview.payables.overdue)}\n`;
    }
    msg += '\n';
    
    msg += '📊 *POSIÇÃO LÍQUIDA*\n';
    msg += `R$ ${formatCurrency(overview.net_position)}\n\n`;
    
    msg += `_Atualizado em: ${new Date().toLocaleString('pt-BR')}_`;

    return msg;

  } catch (error) {
    console.error('❌ Erro:', error);
    return '⚠️ Erro ao consultar visão geral.';
  }
}

async function handleIntelligentQuery(user: any, query: string, supabase: any): Promise<string> {
  console.log('🤖 Processando com Claude Haiku 3.5...');

  // TODO: Integrar com Claude Haiku 3.5 API
  // Por enquanto, resposta padrão
  
  let msg = '🤖 *ASSISTENTE DASHFINANCE*\n\n';
  msg += 'Desculpe, ainda estou aprendendo a responder perguntas complexas.\n\n';
  msg += 'Por enquanto, use:\n';
  msg += '1️⃣ Alertas\n';
  msg += '2️⃣ Saldo\n';
  msg += '3️⃣ DRE\n\n';
  msg += 'Ou pergunte:\n';
  msg += '• "contas a receber"\n';
  msg += '• "contas a pagar"\n';
  msg += '• "visão geral"';

  return msg;
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

async function sendWhatsApp(to: string, text: string) {
  const apiKey = Deno.env.get('WASENDER_API_KEY');
  const apiUrl = Deno.env.get('WASENDER_API_URL') || 'https://wasenderapi.com/api/send-message';

  await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, text }),
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

function getPriorityEmoji(priority: string): string {
  const emojis: Record<string, string> = {
    'critica': '🔴',
    'alta': '🟠',
    'media': '🟡',
    'baixa': '🟢',
  };
  return emojis[priority] || '⚪';
}

