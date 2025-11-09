// =====================================================
// EDGE FUNCTION: whatsapp-onboarding-welcome
// Processa tokens de onboarding e envia mensagem de boas-vindas
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

    const { token, phone } = await req.json();

    console.log(`📱 Processando token: ${token} para ${phone}`);

    // Buscar token
    const { data: tokenData, error: tokenError } = await supabase
      .from('onboarding_tokens')
      .select('*')
      .eq('token', token.toUpperCase())
      .eq('status', 'pending')
      .single();

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Token inválido ou já ativado',
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar se token expirou
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Token expirado',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Criar ou buscar usuário
    let userId: string;
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('telefone_whatsapp', phone)
      .single();

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          nome: tokenData.contact_name || 'Usuário Grupo Volpe',
          telefone_whatsapp: phone,
          email: `${phone.replace(/\D/g, '')}@temp.dashfinance.com`,
        })
        .select('id')
        .single();

      if (userError) {
        throw new Error(`Erro ao criar usuário: ${userError.message}`);
      }
      userId = newUser.id;
    }

    // Vincular empresas ao usuário
    const empresas = tokenData.default_config?.empresas_vinculadas || [];
    if (empresas.length > 0) {
      // Buscar CNPJs das empresas do Grupo Volpe
      const { data: empresasVolpe } = await supabase
        .from('integration_f360')
        .select('cnpj, cliente_nome')
        .eq('grupo_empresarial', 'Grupo Volpe');

      if (empresasVolpe) {
        for (const emp of empresasVolpe) {
          await supabase
            .from('user_companies')
            .upsert({
              user_id: userId,
              company_cnpj: emp.cnpj,
              company_name: emp.cliente_nome,
              grupo_empresarial: 'Grupo Volpe',
              is_active: true,
            });
        }
      }
    }

    // Atualizar token como ativado
    await supabase
      .from('onboarding_tokens')
      .update({
        status: 'activated',
        activated_at: new Date().toISOString(),
        activated_by_phone: phone,
      })
      .eq('id', tokenData.id);

    // Criar sessão WhatsApp
    await supabase
      .from('whatsapp_sessions')
      .upsert({
        phone,
        user_id: userId,
        current_menu: 'main',
        context: {
          onboarding_completed: true,
          token: token,
          tipo_acesso: tokenData.default_config?.tipo_acesso || 'master',
        },
      });

    // Gerar mensagem de boas-vindas
    const welcomeMessage = generateWelcomeMessage(tokenData);

    // Salvar mensagem
    await supabase.from('whatsapp_messages').insert({
      phone,
      direction: 'outbound',
      message_text: welcomeMessage,
      processed: true,
    });

    console.log(`✅ Onboarding completo para ${phone}`);

    return new Response(JSON.stringify({
      success: true,
      message: welcomeMessage,
      user_id: userId,
      empresas_vinculadas: empresas.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('❌ Erro no onboarding:', err);
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : 'Erro desconhecido',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Gera mensagem de boas-vindas personalizada (MENU SIMPLIFICADO)
 */
function generateWelcomeMessage(tokenData: any): string {
  const tipoAcesso = tokenData.default_config?.tipo_acesso || 'master';
  const empresas = tokenData.default_config?.empresas_vinculadas || [];

  const emoji = tipoAcesso === 'master' ? '👔' : '💼';
  const saudacao = tipoAcesso === 'master' ? 'Diretor(a)' : 'Colega';

  return `🎉 *BEM-VINDO(A) AO DASHFINANCE!*

Olá, ${saudacao}! ${emoji}

Seu acesso ao *Grupo Volpe* foi ativado com sucesso!

━━━━━━━━━━━━━━━━━━━━
📊 *SEU ACESSO*

🏢 ${empresas.length} empresas vinculadas
🔑 Token: *${tokenData.token}*
👤 Perfil: *${tipoAcesso === 'master' ? 'Master' : 'Financeiro'}*

━━━━━━━━━━━━━━━━━━━━
📱 *MENU RÁPIDO*

1️⃣ *Alertas* - Ver pendências
2️⃣ *Saldo* - Consultar disponível
3️⃣ *DRE* - Relatório consolidado
4️⃣ *Config* - Preferências

━━━━━━━━━━━━━━━━━━━━
💬 *CONVERSE COMIGO!*

🤖 *Oráculo IFinance de IA*
🚀 Modelo: *ChatGPT 5 FAST*

Você pode me fazer perguntas como:
• "Qual o saldo de todas empresas?"
• "Mostre alertas críticos"
• "Como está o faturamento?"
• "Preciso do DRE de novembro"

Ou use os números 1-4 acima.

━━━━━━━━━━━━━━━━━━━━

Digite *MENU* para ver opções novamente.

_Powered by Oráculo IFinance_ 💎`;
}

/**
 * Capitaliza primeira letra
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

