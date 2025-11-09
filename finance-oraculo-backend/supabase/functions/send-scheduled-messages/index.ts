import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EVO_API_URL = Deno.env.get('EVO_API_URL') || 'http://localhost:8080';
const EVO_API_KEY = Deno.env.get('EVO_API_KEY');

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

// Templates de mensagens
const MESSAGE_TEMPLATES = {
  snapshot: (data: any) =>
    `Caixa hoje (${data.date}): **R$ ${data.cash_balance}** · Disponível p/ pagar hoje: **R$ ${data.available_for_payments}** · Runway: **${data.runway_days} dias**. Responda **OK** para confirmar saldo.`,

  overdue_alert: (data: any) =>
    `⚠️ Vencidas: **${data.overdue_count}** faturas · Total: **R$ ${data.overdue_amount}** · Top 3 credores: ${data.top_creditors}. Sugere pagamento parcial? (Sim/Não)`,

  payables_7d: (data: any) =>
    `Próx. 7 dias: **${data.payables_count}** pagamentos · Total **R$ ${data.payables_amount}** · Sugestão: priorizar ${data.suggest_payment_priorities}.`,

  receivables_overdue: (data: any) =>
    `Receber — Atraso: **${data.debtors_count}** clientes · Valor **R$ ${data.receivables_overdue}** · Top: ${data.top_debtors}. Iniciar cobrança automática? (Sim/Não)`,

  dre_monthly: (data: any) =>
    `DRE ${data.month}: Receita **R$ ${data.revenue}** · COGS **R$ ${data.cogs}** · EBITDA **R$ ${data.ebitda} (${data.ebitda_margin}%)**. Principal variação: ${data.top_variation}.`,

  kpi_weekly: (data: any) =>
    `KPIs (sem): DSO **${data.dso}d**, DPO **${data.dpo}d**, GM% **${data.gross_margin}%**, CAC **${data.cac}**. Observação: ${data.kpi_note}`,

  runway_weekly: (data: any) =>
    `Liquidez semanal: Saldo **R$ ${data.cash_balance}** · P/ despesas fixas/mês **R$ ${data.monthly_burn}** · Runway: **${data.runway_days} dias** · Status: ${data.liquidity_status}.`,

  weekly_summary: (data: any) =>
    `Semana ${data.week}: Caixa Δ **${data.cash_delta}%**, Receita Δ **${data.rev_delta}%**, Atrasos Δ **${data.overdue_delta}%**. Caixa atual: **R$ ${data.cash_balance}**.`,
};

// Enviar mensagem via Evolution API
async function sendWhatsAppMessage(phone: string, message: string) {
  try {
    const response = await fetch(`${EVO_API_URL}/message/sendText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVO_API_KEY || '',
      },
      body: JSON.stringify({
        number: phone,
        text: message,
      }),
    });

    if (!response.ok) {
      throw new Error(`Evolution API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}

// Processar mensagens pendentes
async function processPendingMessages() {
  const supabase = getSupabaseClient();

  // Buscar mensagens pendentes
  const { data: messages, error } = await supabase
    .from('v_pending_messages')
    .select('*')
    .limit(50); // Processar até 50 por vez

  if (error || !messages || messages.length === 0) {
    return { processed: 0, errors: [] };
  }

  const results = [];

  for (const msg of messages) {
    try {
      // Gerar mensagem usando template
      const template = MESSAGE_TEMPLATES[msg.message_type as keyof typeof MESSAGE_TEMPLATES];
      let finalMessage = msg.message_template;

      if (template && msg.message_data) {
        finalMessage = template(msg.message_data);
      }

      // Enviar via Evolution API
      await sendWhatsAppMessage(msg.phone_number, finalMessage);

      // Marcar como enviada
      await supabase
        .from('scheduled_messages')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', msg.id);

      // Salvar no histórico
      await supabase.from('whatsapp_conversations').insert({
        company_cnpj: msg.company_cnpj,
        phone_number: msg.phone_number,
        message_direction: 'outbound',
        message_text: finalMessage,
        message_data: msg.message_data,
      });

      results.push({ id: msg.id, status: 'success' });
    } catch (error) {
      console.error(`Error processing message ${msg.id}:`, error);

      // Marcar como falha
      await supabase
        .from('scheduled_messages')
        .update({
          status: 'failed',
          error_message: error.message,
        })
        .eq('id', msg.id);

      results.push({ id: msg.id, status: 'failed', error: error.message });
    }
  }

  return {
    processed: results.length,
    success: results.filter((r) => r.status === 'success').length,
    failed: results.filter((r) => r.status === 'failed').length,
    results,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const result = await processPendingMessages();

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Send scheduled messages error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    );
  }
});
