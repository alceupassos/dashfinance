// =====================================================
// EDGE FUNCTION: whatsapp-simulator
// Simula interações WhatsApp SEM usar WASender real
// Para testes e desenvolvimento
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

    const { action, phone, message } = await req.json();

    console.log(`🤖 Simulador WhatsApp: ${action}`);

    switch (action) {
      case 'send_token':
        return await simularEnvioToken(supabase, phone || '+5511999999999', message);
      
      case 'send_menu_option':
        return await simularOpcaoMenu(supabase, phone || '+5511999999999', message);
      
      case 'simulate_conversation':
        return await simularConversaCompleta(supabase, phone || '+5511999999999');
      
      case 'generate_test_users':
        return await gerarUsuariosTeste(supabase);
      
      default:
        return new Response(JSON.stringify({
          error: 'Ação inválida. Use: send_token, send_menu_option, simulate_conversation, generate_test_users',
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (err) {
    console.error('❌ Erro no simulador:', err);
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : 'Erro desconhecido',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Simula envio de token
 */
async function simularEnvioToken(supabase: any, phone: string, token: string) {
  console.log(`📱 Simulando: Cliente ${phone} envia token ${token}`);

  // Salvar mensagem inbound
  await supabase.from('whatsapp_messages').insert({
    phone,
    direction: 'inbound',
    message_text: token,
    processed: false,
  });

  // Chamar whatsapp-webhook internamente
  const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-webhook`;
  
  await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
    },
    body: JSON.stringify({
      number: phone.replace('+', ''),
      text: token,
      messageId: `sim-${Date.now()}`,
      timestamp: new Date().toISOString(),
    }),
  });

  // Buscar resposta
  await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1s

  const { data: resposta } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('phone', phone)
    .eq('direction', 'outbound')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return new Response(JSON.stringify({
    success: true,
    enviado: token,
    resposta: resposta?.message_text || 'Sem resposta',
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Simula opção do menu
 */
async function simularOpcaoMenu(supabase: any, phone: string, opcao: string) {
  console.log(`📱 Simulando: Cliente ${phone} escolhe opção ${opcao}`);

  await supabase.from('whatsapp_messages').insert({
    phone,
    direction: 'inbound',
    message_text: opcao,
    processed: false,
  });

  const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-webhook`;
  
  await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
    },
    body: JSON.stringify({
      number: phone.replace('+', ''),
      text: opcao,
      messageId: `sim-${Date.now()}`,
      timestamp: new Date().toISOString(),
    }),
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  const { data: resposta } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('phone', phone)
    .eq('direction', 'outbound')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return new Response(JSON.stringify({
    success: true,
    opcao,
    resposta: resposta?.message_text || 'Sem resposta',
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Simula conversa completa
 */
async function simularConversaCompleta(supabase: any, phone: string) {
  console.log(`🎭 Simulando conversa completa para ${phone}`);

  const passos = [];

  // Passo 1: Enviar token
  passos.push('Enviando token VOL01...');
  await simularEnvioToken(supabase, phone, 'VOL01');
  await delay(2000);

  // Passo 2: Ver alertas (opção 1)
  passos.push('Escolhendo opção 1 (Ver alertas)...');
  await simularOpcaoMenu(supabase, phone, '1');
  await delay(2000);

  // Passo 3: Voltar ao menu (opção 0)
  passos.push('Voltando ao menu (opção 0)...');
  await simularOpcaoMenu(supabase, phone, '0');
  await delay(2000);

  // Passo 4: Adicionar outra empresa (opção 3)
  passos.push('Escolhendo opção 3 (Adicionar empresa)...');
  await simularOpcaoMenu(supabase, phone, '3');
  await delay(2000);

  // Passo 5: Enviar segundo token
  passos.push('Enviando segundo token VOL02...');
  await simularEnvioToken(supabase, phone, 'VOL02');
  await delay(2000);

  // Passo 6: Ajuda
  passos.push('Pedindo ajuda...');
  await simularOpcaoMenu(supabase, phone, 'AJUDA');

  // Buscar histórico completo
  const { data: historico } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('phone', phone)
    .order('created_at', { ascending: true });

  return new Response(JSON.stringify({
    success: true,
    passos,
    total_mensagens: historico?.length || 0,
    historico_resumido: historico?.map((m: any) => ({
      direção: m.direction,
      texto: m.message_text?.substring(0, 50) + '...',
      hora: m.created_at,
    })),
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Gera usuários de teste
 */
async function gerarUsuariosTeste(supabase: any) {
  console.log('👥 Gerando usuários de teste...');

  const usuariosTeste = [
    { nome: 'João Silva (Volpe)', phone: '+5511999991111', tokens: ['VOL01', 'VOL02'] },
    { nome: 'Maria Santos (Dex)', phone: '+5511999992222', tokens: ['DEX01'] },
    { nome: 'Pedro Costa (AAS)', phone: '+5511999993333', tokens: ['AAS01', 'AGS01'] },
    { nome: 'Ana Lima (Acqua)', phone: '+5511999994444', tokens: ['ACQ01'] },
    { nome: 'Carlos Souza (Individual)', phone: '+5511999995555', tokens: ['DER01'] },
  ];

  const resultados = [];

  for (const usuario of usuariosTeste) {
    console.log(`👤 Criando: ${usuario.nome}`);
    
    // Ativar primeiro token
    await simularEnvioToken(supabase, usuario.phone, usuario.tokens[0]);
    await delay(1000);

    // Se tiver mais tokens, ativar também
    for (let i = 1; i < usuario.tokens.length; i++) {
      await delay(1000);
      await simularOpcaoMenu(supabase, usuario.phone, '3'); // Adicionar empresa
      await delay(1000);
      await simularEnvioToken(supabase, usuario.phone, usuario.tokens[i]);
    }

    resultados.push({
      nome: usuario.nome,
      phone: usuario.phone,
      tokens_ativados: usuario.tokens.length,
    });
  }

  // Contar totais
  const { count: sessoes } = await supabase
    .from('whatsapp_sessions')
    .select('*', { count: 'exact', head: true });

  const { count: users } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .not('telefone_whatsapp', 'is', null);

  return new Response(JSON.stringify({
    success: true,
    usuarios_criados: resultados.length,
    sessoes_ativas: sessoes || 0,
    users_com_whatsapp: users || 0,
    detalhes: resultados,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

