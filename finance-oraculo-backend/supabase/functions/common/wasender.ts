// =====================================================
// INTEGRAÇÃO COM WASENDER - WhatsApp Business API
// =====================================================

import { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export interface WASenderConfig {
  apiUrl: string;
  apiKey: string;
  instanceId: string;
}

export interface WhatsAppMessage {
  numero: string; // Formato: 5511999999999 (sem + ou espaços)
  mensagem: string;
  formato?: 'resumido' | 'detalhado' | 'completo';
}

export interface WASenderResponse {
  success: boolean;
  messageId?: string;
  erro?: string;
  status?: number;
}

/**
 * Busca configuração do WASender para o workspace
 */
export async function getWASenderConfig(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<WASenderConfig | null> {
  try {
    const { data, error } = await supabase.rpc('decrypt_wasender_key', {
      p_workspace_id: workspaceId,
    });

    if (error) {
      console.error('❌ Erro ao buscar config WASender:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ Nenhuma configuração WASender encontrada');
      return null;
    }

    return {
      apiUrl: data[0].api_url,
      apiKey: data[0].api_key,
      instanceId: data[0].instance_id,
    };
  } catch (err) {
    console.error('❌ Exceção ao buscar config WASender:', err);
    return null;
  }
}

/**
 * Envia mensagem via WASender
 * API Endpoint: https://wasenderapi.com/api/send-message
 */
export async function enviarWhatsApp(
  config: WASenderConfig,
  message: WhatsAppMessage
): Promise<WASenderResponse> {
  try {
    // Formatar número (remover caracteres especiais, manter apenas dígitos)
    const numeroLimpo = message.numero.replace(/\D/g, '');

    // WASender API correta
    const endpoint = config.apiUrl || 'https://wasenderapi.com/api/send-message';

    console.log(`📱 Enviando WhatsApp para: ${numeroLimpo}`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        to: numeroLimpo,          // ✅ Campo correto: 'to'
        text: message.mensagem,   // ✅ Campo correto: 'text'
      }),
    });

    const responseData = await response.json();

    if (!response.ok || !responseData.success) {
      console.error('❌ Erro WASender:', responseData);
      return {
        success: false,
        erro: responseData.message || 'Erro ao enviar mensagem',
        status: response.status,
      };
    }

    console.log('✅ WhatsApp enviado com sucesso!', responseData);

    return {
      success: true,
      messageId: responseData.data?.msgId || responseData.data?.jid,
      status: response.status,
    };
  } catch (err) {
    console.error('❌ Exceção ao enviar WhatsApp:', err);
    return {
      success: false,
      erro: err instanceof Error ? err.message : 'Erro desconhecido',
    };
  }
}

/**
 * Testa conexão com WASender
 */
export async function testarWASender(
  config: WASenderConfig
): Promise<{ success: boolean; erro?: string }> {
  try {
    const endpoint = `${config.apiUrl}/instance/connectionState/${config.instanceId}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'apikey': config.apiKey,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        erro: data.message || 'Instância não conectada',
      };
    }

    // Verificar se está conectado
    const isConnected = data.state === 'open' || data.instance?.state === 'open';

    return {
      success: isConnected,
      erro: isConnected ? undefined : 'Instância não está conectada ao WhatsApp',
    };
  } catch (err) {
    return {
      success: false,
      erro: err instanceof Error ? err.message : 'Erro ao testar conexão',
    };
  }
}

/**
 * Formata mensagem de alerta para WhatsApp
 */
export function formatarMensagemWhatsApp(
  alerta: any,
  formato: 'resumido' | 'detalhado' | 'completo' = 'detalhado'
): string {
  const emoji = getPrioridadeEmoji(alerta.prioridade);
  const titulo = `${emoji} *${alerta.titulo}*`;

  if (formato === 'resumido') {
    return `${titulo}\n\n${alerta.mensagem}\n\n_Ação necessária!_`;
  }

  if (formato === 'completo') {
    return formatarMensagemCompleta(alerta);
  }

  // Formato detalhado (padrão)
  let msg = `${titulo}\n\n`;
  msg += `📊 *Empresa:* ${alerta.company_cnpj}\n`;
  msg += `📅 *Data:* ${formatarData(alerta.created_at)}\n\n`;
  msg += `${alerta.mensagem}\n\n`;

  // Adicionar dados contextuais se existirem
  if (alerta.dados_contexto) {
    msg += formatarDadosContexto(alerta.dados_contexto);
  }

  msg += `\n_Ver detalhes no sistema_`;

  return msg;
}

/**
 * Formata mensagem completa com todos os detalhes
 */
function formatarMensagemCompleta(alerta: any): string {
  const emoji = getPrioridadeEmoji(alerta.prioridade);
  let msg = `${emoji} *ALERTA: ${alerta.titulo}*\n\n`;

  msg += `📊 *DETALHES*\n`;
  msg += `Empresa: ${alerta.company_cnpj}\n`;
  msg += `Data/Hora: ${formatarData(alerta.created_at)}\n`;
  msg += `Prioridade: ${alerta.prioridade.toUpperCase()}\n\n`;

  msg += `💬 *DESCRIÇÃO*\n`;
  msg += `${alerta.mensagem}\n\n`;

  if (alerta.dados_contexto) {
    msg += `📈 *INFORMAÇÕES*\n`;
    msg += formatarDadosContexto(alerta.dados_contexto);
    msg += `\n`;
  }

  msg += `⚠️ *AÇÃO NECESSÁRIA*\n`;
  msg += `Acesse o sistema para ver detalhes completos e tomar ações.\n\n`;

  msg += `_Alerta gerado automaticamente pelo sistema_`;

  return msg;
}

/**
 * Formata dados contextuais do alerta
 */
function formatarDadosContexto(contexto: any): string {
  let msg = '';

  if (contexto.saldo_atual !== undefined) {
    msg += `💰 Saldo Atual: R$ ${formatarValor(contexto.saldo_atual)}\n`;
  }

  if (contexto.saldo_minimo !== undefined) {
    msg += `📉 Saldo Mínimo: R$ ${formatarValor(contexto.saldo_minimo)}\n`;
  }

  if (contexto.diferenca !== undefined) {
    msg += `⚠️ Diferença: R$ ${formatarValor(contexto.diferenca)}\n`;
  }

  if (contexto.percentual !== undefined) {
    msg += `📊 Percentual: ${contexto.percentual}%\n`;
  }

  if (contexto.taxa_inadimplencia !== undefined) {
    msg += `📈 Inadimplência: ${contexto.taxa_inadimplencia}%\n`;
  }

  if (contexto.titulos_vencidos !== undefined) {
    msg += `📋 Títulos Vencidos: ${contexto.titulos_vencidos}\n`;
  }

  if (contexto.valor_total !== undefined) {
    msg += `💵 Valor Total: R$ ${formatarValor(contexto.valor_total)}\n`;
  }

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
 * Formata valor monetário
 */
function formatarValor(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

/**
 * Formata data para exibição
 */
function formatarData(data: string): string {
  const d = new Date(data);
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(d);
}

/**
 * Registra notificação no banco
 */
export async function registrarNotificacao(
  supabase: SupabaseClient,
  alertId: string,
  alertRuleId: string | null,
  canal: string,
  destinatario: string,
  mensagem: string,
  resultado: WASenderResponse
) {
  try {
    await supabase.from('alert_notifications').insert({
      alert_id: alertId,
      alert_rule_id: alertRuleId,
      canal,
      destinatario,
      mensagem,
      status: resultado.success ? 'enviado' : 'falhou',
      enviado_em: resultado.success ? new Date().toISOString() : null,
      erro: resultado.erro,
      tentativas: 1,
      response_data: resultado,
    });
  } catch (err) {
    console.error('❌ Erro ao registrar notificação:', err);
  }
}

