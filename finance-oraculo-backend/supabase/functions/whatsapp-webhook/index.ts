// =====================================================
// EDGE FUNCTION: whatsapp-webhook
// Recebe mensagens do cliente via WASender e processa
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../common/db.ts';
import { enviarWhatsApp, getWASenderConfig } from '../common/wasender.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Webhook do WASender
    const webhook = await req.json();
    
    const {
      number,  // Ex: 5511999999999
      text,
      messageId,
      timestamp,
    } = webhook;

    const phone = `+${number}`;
    console.log(`📥 Mensagem de ${phone}: "${text}"`);

    // Salvar mensagem
    await supabase.from('whatsapp_messages').insert({
      phone,
      direction: 'inbound',
      message_text: text,
      external_message_id: messageId,
      raw_data: webhook,
    });

    // Processar mensagem
    await processarMensagem(supabase, phone, text);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('❌ Erro no webhook:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Processa mensagem do cliente
 */
async function processarMensagem(supabase: any, phone: string, text: string) {
  const textoLimpo = text.trim().toUpperCase();

  // 1. TOKEN (5 caracteres alfanuméricos)
  if (/^[A-Z0-9]{5}$/.test(textoLimpo)) {
    return await processarToken(supabase, phone, textoLimpo);
  }

  // 2. Opção de menu (0-9)
  if (/^[0-9]$/.test(textoLimpo)) {
    return await processarOpcaoMenu(supabase, phone, textoLimpo);
  }

  // 3. Comandos especiais
  if (/^(MENU|VOLTAR|CANCELAR|SAIR)$/.test(textoLimpo)) {
    return await mostrarMenuPrincipal(supabase, phone);
  }

  if (/^(AJUDA|HELP|\?)$/.test(textoLimpo)) {
    return await enviarAjuda(supabase, phone);
  }

  // 4. Mensagem não reconhecida
  await enviarMensagem(supabase, phone, `
❓ Não entendi sua mensagem.

Para começar, envie seu TOKEN de 5 caracteres.

Exemplo: *VOL01*

Ou digite:
• *MENU* - Menu principal
• *AJUDA* - Ver comandos
  `);
}

/**
 * Processar TOKEN
 */
async function processarToken(supabase: any, phone: string, token: string) {
  console.log(`🔑 Processando token: ${token}`);

  // Validar token
  const { data: validation } = await supabase.rpc('fn_validate_token', {
    p_token: token,
  });

  if (!validation?.valid) {
    const erro = validation?.error || 'unknown';
    
    let mensagem = '❌ Token inválido.\n\n';
    
    if (erro === 'not_found') {
      mensagem += `O token *${token}* não foi encontrado.\n\n`;
      mensagem += 'Verifique se digitou corretamente.';
    } else if (erro === 'already_used') {
      mensagem += `O token *${token}* já foi usado.\n\n`;
      mensagem += 'Entre em contato com o suporte se você é o dono.';
    } else if (erro === 'expired') {
      mensagem += `O token *${token}* expirou.\n\n`;
      mensagem += 'Solicite um novo token.';
    }

    return await enviarMensagem(supabase, phone, mensagem);
  }

  // Token válido - fazer onboarding
  const tokenData = validation.data;
  await realizarOnboarding(supabase, phone, tokenData);
}

/**
 * Realizar onboarding completo
 */
async function realizarOnboarding(supabase: any, phone: string, tokenData: any) {
  console.log(`✅ Onboarding para ${phone}`);

  // 1. Buscar ou criar usuário
  let { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('telefone_whatsapp', phone)
    .single();

  if (!user) {
    const { data: newUser } = await supabase
      .from('users')
      .insert({
        email: `${phone.replace(/\D/g, '')}@whatsapp.temp`,
        nome: tokenData.contact_name || 'Usuário WhatsApp',
        telefone_whatsapp: phone,
        role: 'client',
      })
      .select()
      .single();
    
    user = newUser;
  }

  // 2. Adicionar empresa ao usuário
  await supabase.from('user_companies').insert({
    user_id: user.id,
    company_cnpj: tokenData.company_cnpj,
    company_name: tokenData.company_name,
    grupo_empresarial: tokenData.grupo_empresarial,
    token_used: tokenData.token,
  });

  // 3. Criar regras de alerta padrão
  const alertas = tokenData.default_config?.alertas || [];
  
  for (const alerta of alertas) {
    if (!alerta.ativo) continue;

    await supabase.from('alert_rules').insert({
      user_id: user.id,
      company_cnpj: tokenData.company_cnpj,
      tipo_alerta: alerta.tipo,
      categoria: getCategoriaAlerta(alerta.tipo),
      nome: getNomeAlerta(alerta.tipo),
      ativo: true,
      config: alerta.config,
      notify_whatsapp: true,
      notify_sistema: true,
      horarios_verificacao: ['08:00', '14:00', '18:00'],
      frequencia_maxima: '1_por_hora',
      formato_mensagem: 'detalhado',
    });
  }

  // 4. Criar sessão
  await supabase.from('whatsapp_sessions').upsert({
    phone,
    user_id: user.id,
    current_menu: 'main',
  });

  // 5. Marcar token como ativado
  await supabase
    .from('onboarding_tokens')
    .update({
      status: 'activated',
      activated_at: new Date().toISOString(),
      activated_by_phone: phone,
    })
    .eq('id', tokenData.id);

  // 6. Enviar boas-vindas
  await enviarBoasVindas(supabase, phone, tokenData, alertas.length);
}

/**
 * Enviar mensagem de boas-vindas
 */
async function enviarBoasVindas(supabase: any, phone: string, tokenData: any, qtdAlertas: number) {
  let msg = `🎉 *BEM-VINDO AO DASHFINANCE!*\n\n`;
  msg += `✅ Token *${tokenData.token}* ativado!\n\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🏢 *EMPRESA CADASTRADA*\n\n`;
  msg += `• ${tokenData.company_name}\n`;
  msg += `• CNPJ: ${formatarCNPJ(tokenData.company_cnpj)}\n`;

  if (tokenData.grupo_empresarial) {
    msg += `• Grupo: ${tokenData.grupo_empresarial}\n`;
  }

  msg += `\n📱 Seu WhatsApp foi vinculado!\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `🔔 *ALERTAS CONFIGURADOS*\n`;
  msg += `${qtdAlertas} alerta(s) ativo(s)\n\n`;
  msg += `Você será notificado automaticamente sobre:\n`;
  msg += `• Saldo baixo\n`;
  msg += `• Inadimplência alta\n`;
  msg += `• Contas vencendo\n`;
  msg += `• E mais...\n\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📱 *MENU PRINCIPAL*\n\n`;
  msg += `1️⃣ Ver alertas ativos\n`;
  msg += `2️⃣ Configurar alertas\n`;
  msg += `3️⃣ Adicionar empresa\n`;
  msg += `4️⃣ Minhas preferências\n`;
  msg += `5️⃣ Estatísticas\n`;
  msg += `6️⃣ Ajuda\n\n`;
  msg += `Digite o número da opção desejada`;

  await enviarMensagem(supabase, phone, msg);
}

/**
 * Processar opção do menu
 */
async function processarOpcaoMenu(supabase: any, phone: string, opcao: string) {
  // Verificar sessão
  const { data: session } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('phone', phone)
    .single();

  if (!session) {
    return await enviarMensagem(supabase, phone, `
❌ Você precisa se cadastrar primeiro.

Envie seu TOKEN de 5 caracteres.
Exemplo: *VOL01*
    `);
  }

  switch (opcao) {
    case '1':
      return await mostrarAlertasAtivos(supabase, phone, session);
    case '2':
      return await mostrarConfigAlertas(supabase, phone, session);
    case '3':
      return await mostrarAdicionarEmpresa(supabase, phone, session);
    case '4':
      return await mostrarPreferencias(supabase, phone, session);
    case '5':
      return await mostrarEstatisticas(supabase, phone, session);
    case '6':
      return await enviarAjuda(supabase, phone);
    case '0':
      return await mostrarMenuPrincipal(supabase, phone);
    default:
      return await enviarMensagem(supabase, phone, `
❌ Opção inválida.

Digite um número de 1 a 6, ou 0 para menu.
      `);
  }
}

/**
 * Mostrar alertas ativos
 */
async function mostrarAlertasAtivos(supabase: any, phone: string, session: any) {
  const { data: alertas } = await supabase
    .from('financial_alerts')
    .select('*')
    .eq('status', 'open')
    .order('prioridade, created_at desc')
    .limit(10);

  let msg = `📊 *ALERTAS ATIVOS*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (!alertas || alertas.length === 0) {
    msg += `✅ Nenhum alerta no momento!\n\n`;
    msg += `Tudo está sob controle.\n`;
  } else {
    const criticos = alertas.filter((a: any) => a.prioridade === 'critica').length;
    const altos = alertas.filter((a: any) => a.prioridade === 'alta').length;
    const medios = alertas.filter((a: any) => a.prioridade === 'media').length;

    if (criticos > 0) msg += `🔴 ${criticos} CRÍTICOS\n`;
    if (altos > 0) msg += `🟠 ${altos} ALTA PRIORIDADE\n`;
    if (medios > 0) msg += `🟡 ${medios} MÉDIA\n`;

    msg += `\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Mostrar primeiros 3
    alertas.slice(0, 3).forEach((alerta: any) => {
      const emoji = getEmojiPrioridade(alerta.prioridade);
      msg += `${emoji} ${alerta.titulo}\n`;
      msg += `${alerta.mensagem.substring(0, 60)}...\n\n`;
    });

    if (alertas.length > 3) {
      msg += `...e mais ${alertas.length - 3} alerta(s)\n\n`;
    }
  }

  msg += `Digite *0* para voltar ao menu`;

  await enviarMensagem(supabase, phone, msg);
}

/**
 * Mostrar menu de configuração
 */
async function mostrarConfigAlertas(supabase: any, phone: string, session: any) {
  let msg = `⚙️ *CONFIGURAR ALERTAS*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `Em breve você poderá configurar\n`;
  msg += `seus alertas diretamente aqui!\n\n`;
  msg += `Por enquanto, acesse o sistema web.\n\n`;
  msg += `Digite *0* para voltar ao menu`;

  await enviarMensagem(supabase, phone, msg);
}

/**
 * Mostrar adicionar empresa
 */
async function mostrarAdicionarEmpresa(supabase: any, phone: string, session: any) {
  // Buscar empresas atuais
  const { data: empresas } = await supabase.rpc('fn_get_user_companies', {
    p_user_id: session.user_id,
  });

  let msg = `🏢 *ADICIONAR EMPRESA*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `Você tem acesso a:\n\n`;

  if (empresas && empresas.length > 0) {
    empresas.forEach((emp: any) => {
      msg += `• ${emp.name}\n`;
    });
  }

  msg += `\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `Para adicionar outra empresa,\n`;
  msg += `envie o TOKEN que você recebeu.\n\n`;
  msg += `Exemplo: *ABC12*\n\n`;
  msg += `Ou digite *0* para voltar`;

  await enviarMensagem(supabase, phone, msg);
}

/**
 * Mostrar preferências
 */
async function mostrarPreferencias(supabase: any, phone: string, session: any) {
  let msg = `⚙️ *PREFERÊNCIAS*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `Em breve!\n\n`;
  msg += `Digite *0* para voltar`;

  await enviarMensagem(supabase, phone, msg);
}

/**
 * Mostrar estatísticas
 */
async function mostrarEstatisticas(supabase: any, phone: string, session: any) {
  let msg = `📈 *ESTATÍSTICAS*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `Em breve!\n\n`;
  msg += `Digite *0* para voltar`;

  await enviarMensagem(supabase, phone, msg);
}

/**
 * Mostrar menu principal
 */
async function mostrarMenuPrincipal(supabase: any, phone: string) {
  let msg = `📱 *MENU PRINCIPAL*\n\n`;
  msg += `1️⃣ Ver alertas ativos\n`;
  msg += `2️⃣ Configurar alertas\n`;
  msg += `3️⃣ Adicionar empresa\n`;
  msg += `4️⃣ Preferências\n`;
  msg += `5️⃣ Estatísticas\n`;
  msg += `6️⃣ Ajuda\n\n`;
  msg += `Digite o número da opção`;

  await enviarMensagem(supabase, phone, msg);
}

/**
 * Enviar ajuda
 */
async function enviarAjuda(supabase: any, phone: string) {
  let msg = `❓ *AJUDA*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `*PRIMEIROS PASSOS:*\n`;
  msg += `1. Envie seu TOKEN (5 letras/números)\n`;
  msg += `2. Navegue pelo menu (números 1-6)\n\n`;
  msg += `*COMANDOS:*\n`;
  msg += `• MENU - Menu principal\n`;
  msg += `• AJUDA - Esta mensagem\n`;
  msg += `• 0 - Voltar\n\n`;
  msg += `*SUPORTE:*\n`;
  msg += `Em caso de dúvidas, entre em\n`;
  msg += `contato com nosso suporte.`;

  await enviarMensagem(supabase, phone, msg);
}

/**
 * Enviar mensagem via WASender
 */
async function enviarMensagem(supabase: any, phone: string, mensagem: string) {
  // Buscar config WASender
  const { data: workspace } = await supabase
    .from('users')
    .select('workspace_id')
    .eq('telefone_whatsapp', phone)
    .single();

  if (!workspace?.workspace_id) {
    console.error('❌ Workspace não encontrado');
    return;
  }

  const config = await getWASenderConfig(supabase, workspace.workspace_id);
  if (!config) {
    console.error('❌ Config WASender não encontrada');
    return;
  }

  await enviarWhatsApp(config, {
    numero: phone,
    mensagem,
  });

  // Salvar no log
  await supabase.from('whatsapp_messages').insert({
    phone,
    direction: 'outbound',
    message_text: mensagem,
  });
}

// Helpers
function getCategoriaAlerta(tipo: string): string {
  const map: Record<string, string> = {
    saldo_baixo: 'financeiro',
    inadimplencia_alta: 'financeiro',
    contas_vencendo: 'financeiro',
    taxa_divergente: 'operacional',
  };
  return map[tipo] || 'financeiro';
}

function getNomeAlerta(tipo: string): string {
  const map: Record<string, string> = {
    saldo_baixo: 'Saldo Bancário Baixo',
    inadimplencia_alta: 'Inadimplência Alta',
    contas_vencendo: 'Contas Vencendo',
    taxa_divergente: 'Taxa Divergente',
  };
  return map[tipo] || tipo;
}

function formatarCNPJ(cnpj: string): string {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function getEmojiPrioridade(prioridade: string): string {
  const map: Record<string, string> = {
    critica: '🔴',
    alta: '🟠',
    media: '🟡',
    baixa: '🟢',
  };
  return map[prioridade] || '⚪';
}

