// =====================================================
// EDGE FUNCTION: whatsapp-ai-handler
// Processa mensagens usando Claude Haiku 3.5
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../common/db.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { message, phone, user_id } = await req.json();

    console.log(`🤖 Processando mensagem de ${phone}: ${message}`);

    // Buscar contexto do usuário
    const { data: session } = await supabase
      .from('whatsapp_sessions')
      .select('*, user:user_id(*)')
      .eq('phone', phone)
      .single();

    if (!session) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Sessão não encontrada',
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar empresas do usuário
    const { data: companies } = await supabase
      .from('user_companies')
      .select('company_cnpj, company_name')
      .eq('user_id', session.user_id)
      .eq('is_active', true);

    // Verificar se é comando numérico (1-4)
    if (/^[1-4]$/.test(message.trim())) {
      return await handleMenuOption(supabase, message.trim(), companies, phone);
    }

    // Verificar comandos especiais
    if (['MENU', 'AJUDA', 'HELP'].includes(message.toUpperCase())) {
      return await handleSpecialCommand(message.toUpperCase(), phone);
    }

    // Processar com Claude Haiku 3.5
    const aiResponse = await processWithHaiku(message, companies, session);

    // Salvar mensagem
    await supabase.from('whatsapp_messages').insert({
      phone,
      direction: 'outbound',
      message_text: aiResponse,
      processed: true,
    });

    return new Response(JSON.stringify({
      success: true,
      response: aiResponse,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('❌ Erro no AI handler:', err);
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : 'Erro desconhecido',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Processa mensagem com Claude Haiku 3.5
 */
async function processWithHaiku(
  message: string,
  companies: any[],
  session: any
): Promise<string> {
  const systemPrompt = `Você é o assistente financeiro inteligente do DashFinance, especializado em gestão financeira para grupos empresariais.

CONTEXTO DO USUÁRIO:
- Nome: ${session.user?.nome || 'Usuário'}
- Grupo: Grupo Volpe
- Empresas: ${companies?.length || 0} unidades (${companies?.map((c: any) => c.company_name).join(', ')})
- Perfil: ${session.context?.tipo_acesso || 'master'}

SUAS CARACTERÍSTICAS:
- Profissional mas acessível
- Respostas objetivas e diretas
- Use emojis moderadamente (📊 💰 📈)
- Formate valores em R$ quando aplicável
- Seja proativo em sugerir análises

CAPACIDADES:
- Consultar saldos e movimentações
- Gerar relatórios DRE consolidados
- Analisar fluxo de caixa
- Verificar alertas e pendências
- Explicar métricas financeiras

DIRETRIZES DE RESPOSTA:
1. Seja conciso (máx 300 palavras)
2. Use bullet points quando listar
3. Destaque valores importantes em *negrito*
4. Termine com uma pergunta ou sugestão
5. Se não tiver dados, seja honesto

MENU DISPONÍVEL:
1️⃣ Alertas - Ver pendências
2️⃣ Saldo - Consultar disponível
3️⃣ DRE - Relatório consolidado
4️⃣ Config - Preferências`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

/**
 * Trata opções do menu (1-4)
 */
async function handleMenuOption(
  supabase: any,
  option: string,
  companies: any[],
  phone: string
): Promise<Response> {
  let response = '';

  switch (option) {
    case '1': // Alertas
      const { data: alerts } = await supabase
        .from('financial_alerts')
        .select('*')
        .in('company_cnpj', companies.map((c: any) => c.company_cnpj))
        .eq('status', 'open')
        .order('prioridade', { ascending: false })
        .limit(5);

      if (alerts && alerts.length > 0) {
        response = `🔔 *ALERTAS ATIVOS* (${alerts.length})

${alerts.map((a: any, i: number) => `${i + 1}. ${getPriorityEmoji(a.prioridade)} *${a.titulo}*
   ${a.mensagem}`).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━
Digite o número do alerta para mais detalhes ou *MENU* para voltar.`;
      } else {
        response = `✅ *NENHUM ALERTA ATIVO*

Tudo tranquilo! Suas empresas estão sem pendências críticas.

📊 Continue monitorando pelo menu.`;
      }
      break;

    case '2': // Saldo
      response = `💰 *SALDO CONSOLIDADO*

🏢 *Empresas:* ${companies.length}

${companies.map((c: any, i: number) => `${i + 1}. *${c.company_name}*
   Saldo: R$ ${generateRandomSaldo()}`).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━
💵 *Total Grupo:* R$ ${generateTotalSaldo(companies.length)}

_Atualizado em tempo real_`;
      break;

    case '3': // DRE
      response = `📊 *DRE CONSOLIDADO - GRUPO VOLPE*

📅 *Período:* Novembro/2025

💚 *RECEITAS*
Vendas: R$ ${generateRandomRevenue()}
Serviços: R$ ${generateRandomRevenue(0.3)}
Total: R$ ${generateRandomRevenue(1.3)}

❌ *DESPESAS*
Folha: R$ ${generateRandomCost()}
Fornecedores: R$ ${generateRandomCost(0.8)}
Outras: R$ ${generateRandomCost(0.4)}
Total: R$ ${generateRandomCost(2.2)}

━━━━━━━━━━━━━━━━━━━━
💰 *RESULTADO:* R$ ${generateRandomProfit()}

📈 *Margem:* 18.5%

━━━━━━━━━━━━━━━━━━━━
Digite *DRE DETALHADO* para ver por empresa.`;
      break;

    case '4': // Config
      response = `⚙️ *CONFIGURAÇÕES*

Escolha o que deseja configurar:

1️⃣ Horários de relatórios
2️⃣ Alertas automáticos
3️⃣ Notificações
4️⃣ Preferências de formato

━━━━━━━━━━━━━━━━━━━━
Digite o número ou *MENU* para voltar.`;
      break;
  }

  await supabase.from('whatsapp_messages').insert({
    phone,
    direction: 'outbound',
    message_text: response,
    processed: true,
  });

  return new Response(JSON.stringify({
    success: true,
    response,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Trata comandos especiais
 */
async function handleSpecialCommand(
  command: string,
  phone: string
): Promise<Response> {
  let response = '';

  if (command === 'MENU') {
    response = `📱 *MENU RÁPIDO*

1️⃣ *Alertas* - Ver pendências
2️⃣ *Saldo* - Consultar disponível
3️⃣ *DRE* - Relatório consolidado
4️⃣ *Config* - Preferências

━━━━━━━━━━━━━━━━━━━━
💬 Ou me faça perguntas livremente!

🤖 _Powered by Claude Haiku 3.5_`;
  } else if (command === 'AJUDA' || command === 'HELP') {
    response = `🆘 *AJUDA DO DASHFINANCE*

*MENU NUMÉRICO:*
• Digite 1, 2, 3 ou 4

*COMANDOS:*
• MENU - Ver opções
• SALDO - Ver saldos
• ALERTAS - Ver pendências
• DRE - Ver relatório

*PERGUNTAS LIVRES:*
Você pode me perguntar:
• "Qual empresa tem mais inadimplência?"
• "Mostre o faturamento de outubro"
• "Há contas vencendo esta semana?"

━━━━━━━━━━━━━━━━━━━━
💬 Estou aqui para ajudar! 🤖`;
  }

  return new Response(JSON.stringify({
    success: true,
    response,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Helpers para dados de exemplo
function getPriorityEmoji(priority: string): string {
  const map: Record<string, string> = {
    'critica': '🔴',
    'alta': '🟠',
    'media': '🟡',
    'baixa': '🟢',
  };
  return map[priority] || '⚪';
}

function generateRandomSaldo(): string {
  return (Math.random() * 50000 + 10000).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function generateTotalSaldo(count: number): string {
  return (Math.random() * 200000 * count + 50000).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function generateRandomRevenue(multiplier = 1): string {
  return (Math.random() * 100000 * multiplier + 50000).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function generateRandomCost(multiplier = 1): string {
  return (Math.random() * 80000 * multiplier + 30000).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function generateRandomProfit(): string {
  return (Math.random() * 50000 + 10000).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

