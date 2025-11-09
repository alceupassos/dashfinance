import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WASENDER_API_KEY = Deno.env.get('WASENDER_API_KEY')!;
const WASENDER_BASE_URL = 'https://wasenderapi.com/api';

interface CommandRequest {
  phone_number: string;
  message: string;
  company_cnpj?: string;
}

function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

async function sendWhatsAppMessage(to: string, text: string) {
  try {
    const response = await fetch(`${WASENDER_BASE_URL}/send-message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WASENDER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, text }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`WaSender error: ${JSON.stringify(data)}`);
    }

    console.log('✅ Message sent successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Error sending message:', error);
    throw error;
  }
}

async function getClientByCNPJ(cnpj: string) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('cnpj', cnpj)
    .single();

  if (error) {
    console.error('Error fetching client:', error);
    return null;
  }

  return data;
}

async function getClientByPhone(phone: string) {
  const supabase = getSupabaseClient();

  // Try whatsapp_phone first, then phone
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .or(`whatsapp_phone.eq.${phone},phone.eq.${phone}`)
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching client by phone:', error);
    return null;
  }

  return data;
}

async function getKPIData(cnpj: string) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_kpi_monthly_enriched')
    .select('*')
    .eq('cnpj', cnpj)
    .order('reference_month', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching KPI data:', error);
    return null;
  }

  return data?.[0];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

async function processBalanceCommand(client: any, phone: string) {
  const kpi = await getKPIData(client.cnpj);

  if (!kpi) {
    return `Olá! Não encontrei dados financeiros recentes para sua empresa. Entre em contato com nosso suporte.`;
  }

  const month = new Date(kpi.reference_month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  let message = `📊 *Resumo Financeiro - ${month}*\n\n`;
  message += `🏢 *${client.razao_social}*\n`;
  message += `CNPJ: ${client.cnpj}\n\n`;

  message += `💰 *Faturamento*\n`;
  message += `Total: ${formatCurrency(kpi.total_revenue || 0)}\n\n`;

  message += `📉 *Custos e Despesas*\n`;
  message += `Total: ${formatCurrency(kpi.total_costs || 0)}\n\n`;

  message += `💵 *Lucro Líquido*\n`;
  message += `Total: ${formatCurrency(kpi.net_profit || 0)}\n`;
  message += `Margem: ${formatPercentage(kpi.net_margin || 0)}\n\n`;

  message += `📈 *Indicadores*\n`;
  if (kpi.ebitda !== null) {
    message += `EBITDA: ${formatCurrency(kpi.ebitda)}\n`;
    message += `Margem EBITDA: ${formatPercentage(kpi.ebitda_margin || 0)}\n`;
  }

  message += `\n_Dados atualizados automaticamente pelo Finance Oráculo_`;

  return message;
}

async function processDRECommand(client: any, phone: string) {
  const kpi = await getKPIData(client.cnpj);

  if (!kpi) {
    return `Olá! Não encontrei dados de DRE recentes para sua empresa. Entre em contato com nosso suporte.`;
  }

  const month = new Date(kpi.reference_month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  let message = `📋 *DRE Resumida - ${month}*\n\n`;
  message += `🏢 *${client.razao_social}*\n\n`;

  message += `*RECEITAS*\n`;
  message += `Receita Bruta: ${formatCurrency(kpi.total_revenue || 0)}\n`;
  message += `(-) Deduções: ${formatCurrency(kpi.total_deductions || 0)}\n`;
  message += `= Receita Líquida: ${formatCurrency((kpi.total_revenue || 0) - (kpi.total_deductions || 0))}\n\n`;

  message += `*CUSTOS*\n`;
  message += `(-) Custos: ${formatCurrency(kpi.total_costs || 0)}\n`;
  message += `= Lucro Bruto: ${formatCurrency(kpi.gross_profit || 0)}\n`;
  message += `Margem: ${formatPercentage(kpi.gross_margin || 0)}\n\n`;

  message += `*DESPESAS*\n`;
  message += `(-) Operacionais: ${formatCurrency(kpi.operational_expenses || 0)}\n\n`;

  message += `*RESULTADO*\n`;
  if (kpi.ebitda !== null) {
    message += `= EBITDA: ${formatCurrency(kpi.ebitda)}\n`;
  }
  message += `= Lucro Líquido: ${formatCurrency(kpi.net_profit || 0)}\n`;
  message += `Margem Líquida: ${formatPercentage(kpi.net_margin || 0)}\n\n`;

  message += `_Finance Oráculo - Inteligência Financeira_`;

  return message;
}

async function processHelpCommand(client: any | null) {
  let message = `🤖 *Finance Oráculo - Comandos Disponíveis*\n\n`;

  message += `📊 */saldo* - Resumo financeiro do mês\n`;
  message += `📋 */dre* - DRE (Demonstração de Resultado)\n`;
  message += `📈 */kpis* - Principais indicadores\n`;
  message += `💰 */fluxo* - Fluxo de caixa\n`;
  message += `❓ */ajuda* - Esta mensagem\n\n`;

  if (client) {
    message += `Você está cadastrado como:\n`;
    message += `🏢 ${client.razao_social}\n`;
    message += `CNPJ: ${client.cnpj}\n\n`;
  } else {
    message += `⚠️ Seu número não está cadastrado.\n`;
    message += `Entre em contato para começar a usar.\n\n`;
  }

  message += `_Precisa de ajuda? Fale com nosso suporte._`;

  return message;
}

async function processCommand(request: CommandRequest) {
  const message = request.message.trim().toLowerCase();

  // Find client
  let client = null;
  if (request.company_cnpj) {
    client = await getClientByCNPJ(request.company_cnpj);
  }
  if (!client) {
    client = await getClientByPhone(request.phone_number);
  }

  // Process commands
  let response: string;

  if (message === '/saldo' || message === '/balance') {
    if (!client) {
      response = `❌ Desculpe, não encontrei seu cadastro. Entre em contato com nosso suporte para se cadastrar.`;
    } else {
      response = await processBalanceCommand(client, request.phone_number);
    }
  } else if (message === '/dre') {
    if (!client) {
      response = `❌ Desculpe, não encontrei seu cadastro. Entre em contato com nosso suporte para se cadastrar.`;
    } else {
      response = await processDRECommand(client, request.phone_number);
    }
  } else if (message === '/ajuda' || message === '/help' || message === '/comandos') {
    response = await processHelpCommand(client);
  } else if (message.startsWith('/')) {
    response = `❓ Comando não reconhecido: ${message}\n\nDigite */ajuda* para ver os comandos disponíveis.`;
  } else {
    // Not a command, ignore
    return {
      processed: false,
      message: 'Not a command',
    };
  }

  // Send response
  await sendWhatsAppMessage(request.phone_number, response);

  return {
    processed: true,
    message: response,
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const request: CommandRequest = await req.json();

    console.log('📥 Processing command:', request);

    const result = await processCommand(request);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error processing command:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    );
  }
});
