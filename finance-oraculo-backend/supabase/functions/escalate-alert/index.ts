// =====================================================
// EDGE FUNCTION: escalate-alert
// Escalona alertas não respondidos para outros usuários
// Executado via CRON a cada 5 minutos
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

    console.log('⚡ Verificando alertas para escalonamento...');

    // Buscar alertas não respondidos
    const { data: alertas, error } = await supabase.rpc('fn_get_unresponded_alerts', {
      p_minutos_sem_resposta: 30,
    });

    if (error) {
      console.error('❌ Erro ao buscar alertas:', error);
      throw error;
    }

    if (!alertas || alertas.length === 0) {
      console.log('✅ Nenhum alerta para escalonar');
      return new Response(
        JSON.stringify({
          success: true,
          escalados: 0,
          message: 'Nenhum alerta para escalonar',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📢 ${alertas.length} alerta(s) para escalonar`);

    let escalados = 0;
    const erros: string[] = [];

    // Escalonar cada alerta
    for (const alerta of alertas) {
      try {
        console.log(`⬆️ Escalonando alerta ${alerta.alert_id}...`);

        // Buscar dados do usuário de escalonamento
        const { data: user } = await supabase
          .from('users')
          .select('*')
          .eq('id', alerta.escalonamento_user_id)
          .single();

        if (!user) {
          console.warn(`⚠️ Usuário de escalonamento não encontrado`);
          continue;
        }

        // Enviar notificação de escalonamento
        const mensagem = gerarMensagemEscalonamento(alerta);

        // WhatsApp
        if (user.telefone_whatsapp) {
          await supabase.functions.invoke('send-alert-whatsapp', {
            body: {
              alert_id: alerta.alert_id,
              alert_rule_id: null,
              formato: 'completo',
              destinatario_override: user.telefone_whatsapp,
              mensagem_override: mensagem,
            },
          });
        }

        // Email (TODO)
        if (user.email) {
          // TODO: Implementar envio de email
          console.log(`📧 Email para ${user.email} (TODO)`);
        }

        // Registrar escalonamento
        await supabase.from('alert_actions').insert({
          alert_id: alerta.alert_id,
          user_id: alerta.escalonamento_user_id,
          acao: 'escalado',
          observacoes: `Escalado automaticamente após ${Math.round(alerta.minutos_sem_resposta)} minutos sem resposta`,
        });

        // Atualizar status do alerta
        await supabase
          .from('financial_alerts')
          .update({ status: 'escalated' })
          .eq('id', alerta.alert_id);

        escalados++;
        console.log(`✅ Alerta ${alerta.alert_id} escalado com sucesso`);
      } catch (err) {
        const errorMsg = `Erro ao escalonar ${alerta.alert_id}: ${err}`;
        console.error(`❌ ${errorMsg}`);
        erros.push(errorMsg);
      }
    }

    console.log(`✅ Escalonamento concluído: ${escalados} alerta(s)`);

    return new Response(
      JSON.stringify({
        success: true,
        escalados,
        total_verificados: alertas.length,
        erros: erros.length > 0 ? erros : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('❌ Erro no escalate-alert:', err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Erro desconhecido',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Gera mensagem de escalonamento
 */
function gerarMensagemEscalonamento(alerta: any): string {
  const emoji = getPrioridadeEmoji(alerta.prioridade);
  const minutos = Math.round(alerta.minutos_sem_resposta);

  let msg = `${emoji} *ALERTA ESCALADO*\n\n`;
  msg += `⚠️ Este alerta não foi respondido em ${minutos} minutos\n\n`;
  msg += `*Título:* ${alerta.titulo}\n`;
  msg += `*Empresa:* ${alerta.company_cnpj}\n`;
  msg += `*Prioridade:* ${alerta.prioridade.toUpperCase()}\n`;
  msg += `*Criado:* ${formatarData(alerta.criado_em)}\n\n`;
  msg += `🎯 *Ação imediata necessária!*\n`;
  msg += `Acesse o sistema para ver detalhes e tomar providências.`;

  return msg;
}

/**
 * Retorna emoji baseado na prioridade
 */
function getPrioridadeEmoji(prioridade: string): string {
  const emojis: Record<string, string> = {
    'critica': '🔴',
    'alta': '🟠',
    'media': '🟡',
    'baixa': '🟢',
  };
  return emojis[prioridade] || '⚪';
}

/**
 * Formata data
 */
function formatarData(data: string): string {
  const d = new Date(data);
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(d);
}

