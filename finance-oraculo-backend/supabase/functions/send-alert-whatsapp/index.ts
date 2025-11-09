// =====================================================
// EDGE FUNCTION: send-alert-whatsapp
// Envia alertas via WhatsApp usando WASender
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../common/db.ts';
import {
  getWASenderConfig,
  enviarWhatsApp,
  formatarMensagemWhatsApp,
  registrarNotificacao,
} from '../common/wasender.ts';

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { alert_id, alert_rule_id, workspace_id, formato = 'detalhado' } = body;

    if (!alert_id) {
      return new Response(
        JSON.stringify({ error: 'alert_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📱 Enviando alerta ${alert_id} via WhatsApp...`);

    // 1. Buscar dados do alerta
    const { data: alerta, error: alertError } = await supabase
      .from('v_alerts_with_actions')
      .select('*')
      .eq('id', alert_id)
      .single();

    if (alertError || !alerta) {
      console.error('❌ Alerta não encontrado:', alertError);
      return new Response(
        JSON.stringify({ error: 'Alerta não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Verificar se usuário tem WhatsApp configurado
    if (!alerta.user_whatsapp) {
      console.warn('⚠️ Usuário não tem WhatsApp configurado');
      return new Response(
        JSON.stringify({ 
          error: 'Usuário não tem número WhatsApp configurado',
          alert_id,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Buscar configuração WASender
    const wsId = workspace_id || alerta.workspace_id || 
                 (await getDefaultWorkspaceId(supabase));
    
    const config = await getWASenderConfig(supabase, wsId);

    if (!config) {
      console.error('❌ Configuração WASender não encontrada');
      return new Response(
        JSON.stringify({ error: 'WASender não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Formatar mensagem
    const mensagem = formatarMensagemWhatsApp(alerta, formato);

    // 5. Enviar WhatsApp
    const resultado = await enviarWhatsApp(config, {
      numero: alerta.user_whatsapp,
      mensagem,
      formato,
    });

    // 6. Registrar notificação
    await registrarNotificacao(
      supabase,
      alert_id,
      alert_rule_id,
      'whatsapp',
      alerta.user_whatsapp,
      mensagem,
      resultado
    );

    // 7. Atualizar alerta
    if (resultado.success) {
      await supabase
        .from('financial_alerts')
        .update({
          notificado_whatsapp: true,
          notificado_whatsapp_em: new Date().toISOString(),
        })
        .eq('id', alert_id);
    }

    // 8. Resposta
    return new Response(
      JSON.stringify({
        success: resultado.success,
        alert_id,
        message_id: resultado.messageId,
        erro: resultado.erro,
        destinatario: alerta.user_whatsapp,
      }),
      { 
        status: resultado.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('❌ Erro no send-alert-whatsapp:', err);
    return new Response(
      JSON.stringify({ 
        error: err instanceof Error ? err.message : 'Erro desconhecido',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Helper: buscar workspace_id padrão
 */
async function getDefaultWorkspaceId(supabase: any): Promise<string> {
  const { data } = await supabase
    .from('users')
    .select('workspace_id')
    .limit(1)
    .single();
  
  return data?.workspace_id || '';
}

