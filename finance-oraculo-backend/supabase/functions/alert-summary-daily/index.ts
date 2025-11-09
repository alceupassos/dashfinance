// =====================================================
// EDGE FUNCTION: alert-summary-daily
// Envia resumo diário de alertas
// Executado via CRON 1x por dia (08:00 Brasília)
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

    console.log('📊 Gerando resumo diário de alertas...');

    // Buscar usuários que querem receber resumo diário
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .not('telefone_whatsapp', 'is', null);

    if (!users || users.length === 0) {
      console.log('⚠️ Nenhum usuário para enviar resumo');
      return new Response(
        JSON.stringify({ success: true, enviados: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let enviados = 0;

    for (const user of users) {
      try {
        // Buscar estatísticas do usuário
        const { data: stats } = await supabase.rpc('fn_alert_statistics', {
          p_cnpj: null, // TODO: Filtrar por empresas do usuário
          p_dias: 1,
        });

        if (!stats) continue;

        // Buscar alertas abertos críticos/altos
        const { data: alertasCriticos } = await supabase
          .from('financial_alerts')
          .select('*')
          .in('prioridade', ['critica', 'alta'])
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(5);

        // Gerar mensagem de resumo
        const mensagem = gerarResumo Diario(stats, alertasCriticos || []);

        // Enviar WhatsApp
        if (user.telefone_whatsapp) {
          const { data: config } = await supabase.rpc('decrypt_wasender_key', {
            p_workspace_id: user.workspace_id,
          });

          if (config && config.length > 0) {
            const response = await fetch(
              `${config[0].api_url}/message/sendText/${config[0].instance_id}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': config[0].api_key,
                },
                body: JSON.stringify({
                  number: user.telefone_whatsapp.replace(/\D/g, ''),
                  text: mensagem,
                }),
              }
            );

            if (response.ok) {
              enviados++;
              console.log(`✅ Resumo enviado para ${user.email}`);
            }
          }
        }
      } catch (err) {
        console.error(`❌ Erro ao enviar resumo para ${user.email}:`, err);
      }
    }

    console.log(`✅ Resumos enviados: ${enviados}`);

    return new Response(
      JSON.stringify({
        success: true,
        enviados,
        total_usuarios: users.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('❌ Erro no alert-summary-daily:', err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Erro desconhecido',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Gera mensagem de resumo diário
 */
function gerarResumoDiario(stats: any, alertasCriticos: any[]): string {
  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  });

  let msg = `📊 *RESUMO DIÁRIO DE ALERTAS*\n`;
  msg += `${hoje}\n\n`;

  msg += `📈 *Estatísticas (Últimas 24h)*\n`;
  msg += `Total: ${stats.total || 0}\n`;

  if (stats.criticos > 0) {
    msg += `🔴 Críticos: ${stats.criticos}\n`;
  }
  if (stats.altos > 0) {
    msg += `🟠 Alta: ${stats.altos}\n`;
  }
  if (stats.medios > 0) {
    msg += `🟡 Média: ${stats.medios}\n`;
  }

  msg += `\n✅ Resolvidos: ${stats.resolvidos || 0}\n`;
  msg += `⏱️ Tempo médio: ${stats.tempo_medio_resolucao ? `${stats.tempo_medio_resolucao.toFixed(1)}h` : 'N/A'}\n`;

  if (alertasCriticos.length > 0) {
    msg += `\n🚨 *Alertas Críticos/Altos Abertos*\n`;
    alertasCriticos.slice(0, 3).forEach((alerta, idx) => {
      const emoji = alerta.prioridade === 'critica' ? '🔴' : '🟠';
      msg += `\n${idx + 1}. ${emoji} ${alerta.titulo}\n`;
      msg += `   ${alerta.company_cnpj}\n`;
    });

    if (alertasCriticos.length > 3) {
      msg += `\n...e mais ${alertasCriticos.length - 3} alerta(s)\n`;
    }
  }

  msg += `\n📱 Acesse o sistema para mais detalhes`;

  return msg;
}

