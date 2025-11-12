import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

function onlyDigits(text: string): string {
  return text.replace(/[^0-9]/g, '');
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// Estimar tokens (aproximação: 1 token = 4 caracteres)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Hash para cache
function hashQuestion(question: string): string {
  return btoa(question.toLowerCase().trim()).substring(0, 32);
}

// ========================================
// MEMÓRIA DE CONVERSAÇÃO (Context Window 120)
// ========================================

// Buscar ou criar conversa
async function getOrCreateConversation(phone: string, cnpj: string) {
  const supabase = getSupabaseClient();
  const cleanCnpj = onlyDigits(cnpj);

  // Buscar conversa ativa (última atividade < 24h)
  const { data: existing } = await supabase
    .from('whatsapp_conversations')
    .select('id')
    .eq('phone_number', phone)
    .eq('company_cnpj', cleanCnpj)
    .gte('last_message_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('last_message_at', { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    return existing.id;
  }

  // Criar nova conversa
  const { data: newConv, error } = await supabase
    .from('whatsapp_conversations')
    .insert({
      phone_number: phone,
      company_cnpj: cleanCnpj,
      last_message_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) throw error;
  return newConv.id;
}

// Obter context completo (resumos + últimas 120 mensagens)
async function getConversationContext(conversationId: string) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .rpc('fn_get_conversation_context', {
      p_conversation_id: conversationId,
      p_limit: 120,
    });

  if (error) {
    console.error('Error fetching context:', error);
    return { summaries: [], messages: [] };
  }

  return data || { summaries: [], messages: [] };
}

// Adicionar mensagem ao contexto
async function addMessageToContext(
  conversationId: string,
  phone: string,
  cnpj: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  metadata?: any,
  llmModel?: string,
  costUsd?: number
) {
  const supabase = getSupabaseClient();
  const tokens = estimateTokens(content);

  const { error } = await supabase.rpc('fn_add_message_to_context', {
    p_conversation_id: conversationId,
    p_user_phone: phone,
    p_user_cnpj: onlyDigits(cnpj),
    p_role: role,
    p_content: content,
    p_tokens: tokens,
    p_llm_model: llmModel || null,
    p_cost_usd: costUsd || null,
    p_metadata: metadata || null,
  });

  if (error) {
    console.error('Error adding message to context:', error);
  }
}

// Atualizar analytics da conversa
async function updateConversationAnalytics(
  conversationId: string,
  phone: string,
  cnpj: string,
  isUserMessage: boolean,
  success: boolean,
  offTopic: boolean,
  tokensInput: number,
  tokensOutput: number,
  costUsd: number,
  modelUsed: string | null,
  responseTimeSeconds: number | null
) {
  const supabase = getSupabaseClient();

  await supabase.rpc('fn_update_conversation_analytics', {
    p_conversation_id: conversationId,
    p_user_phone: phone,
    p_user_cnpj: onlyDigits(cnpj),
    p_is_user_message: isUserMessage,
    p_success: success,
    p_off_topic: offTopic,
    p_tokens_input: tokensInput,
    p_tokens_output: tokensOutput,
    p_cost_usd: costUsd,
    p_model_used: modelUsed,
    p_response_time_seconds: responseTimeSeconds,
  });
}

// ========================================
// ROTEAMENTO INTELIGENTE DE LLM
// ========================================

// Escolher melhor modelo baseado na pergunta
async function routeToOptimalLLM(question: string): Promise<any> {
  const supabase = getSupabaseClient();
  const tokens = estimateTokens(question);

  // Detectar se requer raciocínio complexo
  const reasoningKeywords = ['analisar', 'estratégia', 'recomendação', 'insights', 'tendência', 'previsão', 'cenário', 'otimizar', 'melhorar'];
  const requiresReasoning = reasoningKeywords.some(k => question.toLowerCase().includes(k));

  // Detectar se requer cálculos
  const calculationKeywords = ['calcular', 'comparar', 'diferença', 'variação', 'percentual', 'média', 'projeção', 'somar', 'quanto'];
  const requiresCalculation = calculationKeywords.some(k => question.toLowerCase().includes(k));

  const { data, error } = await supabase.rpc('fn_route_to_best_llm', {
    p_question: question,
    p_estimated_tokens: tokens,
    p_requires_reasoning: requiresReasoning,
    p_requires_calculation: requiresCalculation,
  });

  if (error || !data) {
    console.error('Error routing LLM:', error);
    // Fallback: usar modelo mais barato
    return {
      model_name: 'claude-3-5-haiku-20241022',
      model_id: null,
      rule_matched: 'fallback',
      estimated_tokens: tokens,
    };
  }

  return data;
}

// ========================================
// BUSCAR CONTEXTO FINANCEIRO
// ========================================

async function getClientContext(cnpj: string) {
  const supabase = getSupabaseClient();

  // Buscar snapshot mais recente
  const { data: snapshot } = await supabase
    .from('daily_snapshots')
    .select('*')
    .eq('company_cnpj', onlyDigits(cnpj))
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single();

  // Buscar dados DRE últimos 3 meses
  const { data: dreData } = await supabase
    .from('v_kpi_monthly_enriched')
    .select('*')
    .eq('company_cnpj', onlyDigits(cnpj))
    .gte('month', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('month', { ascending: false });

  return {
    snapshot,
    dre: dreData || [],
    cnpj: onlyDigits(cnpj),
  };
}

// Verificar se pergunta é relacionada a finanças
async function isFinancialQuestion(question: string): Promise<boolean> {
  const financialKeywords = [
    'caixa', 'receita', 'despesa', 'custo', 'lucro', 'prejuízo', 'fatura', 'pagamento',
    'recebimento', 'vencimento', 'atraso', 'saldo', 'dre', 'fluxo', 'cash', 'ebitda',
    'margem', 'cliente', 'fornecedor', 'conta', 'banco', 'pagar', 'receber', 'dinheiro',
    'real', 'reais', 'r$', 'financeiro', 'orçamento', 'previsão', 'runway', 'kpi',
    'vendas', 'faturamento', 'inadimplência', 'cobrança', 'boleto', 'pix', 'nf', 'nota fiscal'
  ];

  const lowerQuestion = question.toLowerCase();
  return financialKeywords.some(keyword => lowerQuestion.includes(keyword));
}

// Consultar API externa F360/OMIE em tempo real
async function fetchExternalData(cnpj: string, dataType: 'f360' | 'omie', query: string) {
  const supabase = getSupabaseClient();
  const cleanCnpj = onlyDigits(cnpj);

  try {
    if (dataType === 'f360') {
      // Obter chave KMS do ambiente
      const kmsKey = Deno.env.get('APP_KMS');
      if (!kmsKey) {
        return { source: 'f360', error: 'APP_KMS não configurado' };
      }

      const { data: integration } = await supabase
        .from('integration_f360')
        .select('id, cliente_nome')
        .eq('cnpj', cleanCnpj)
        .single();

      if (!integration) {
        return { source: 'f360', error: 'Integração F360 não encontrada' };
      }

      const { data: token } = await supabase.rpc('decrypt_f360_token', { _id: integration.id, _kms: kmsKey });
      if (!token) return { source: 'f360', error: 'Token inválido' };

      const F360_API_BASE = Deno.env.get('F360_API_BASE') || 'https://api.f360.com.br/v1';
      // Usar endpoint de DRE para obter dados recentes
      const dateEnd = new Date();
      const dateStart = new Date();
      dateStart.setDate(dateStart.getDate() - 30);
      const response = await fetch(`${F360_API_BASE}/reports/dre?date_start=${dateStart.toISOString().split('T')[0]}&date_end=${dateEnd.toISOString().split('T')[0]}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) return { source: 'f360', error: `Erro: ${response.status}` };
      const data = await response.json();
      return { source: 'f360', data, timestamp: new Date().toISOString() };

    } else {
      const { data: integration } = await supabase
        .from('integration_omie')
        .select('id, cliente_nome')
        .eq('cnpj', cleanCnpj)
        .single();

      if (!integration) return { source: 'omie', error: 'Integração OMIE não encontrada' };

      const { data: keys } = await supabase.rpc('decrypt_omie_keys', { _id: integration.id });
      if (!keys) return { source: 'omie', error: 'Chaves inválidas' };

      const OMIE_API_BASE = Deno.env.get('OMIE_API_BASE') || 'https://app.omie.com.br/api/v1/';
      const response = await fetch(`${OMIE_API_BASE}/financas/contacorrente/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          call: 'ListarContasCorrentes',
          app_key: keys.app_key,
          app_secret: keys.app_secret,
          param: [{ pagina: 1, registros_por_pagina: 50 }],
        }),
      });

      if (!response.ok) return { source: 'omie', error: `Erro: ${response.status}` };
      const data = await response.json();
      return { source: 'omie', data, timestamp: new Date().toISOString() };
    }
  } catch (error) {
    return { source: dataType, error: error.message };
  }
}

// ========================================
// GERAR RESPOSTA COM IA (com modelo escolhido)
// ========================================

async function generateAIResponse(
  question: string,
  context: any,
  conversationHistory: any,
  selectedModel: any
): Promise<{ answer: string; tokens: { input: number; output: number }; cost: number }> {
  // Verificar se é pergunta financeira
  const isFinancial = await isFinancialQuestion(question);

  if (!isFinancial) {
    return {
      answer: '❌ Desculpe, só posso responder perguntas sobre **assuntos financeiros** da sua empresa. Pergunte sobre caixa, receitas, despesas, faturas, etc.',
      tokens: { input: 0, output: 0 },
      cost: 0,
    };
  }

  // Construir histórico formatado em Markdown
  const historyText = conversationHistory.messages
    ?.slice(-10) // Últimas 10 mensagens
    .map((msg: any) => {
      const role = msg.role === 'user' ? '👤 **Cliente**' : '🤖 **Assistente**';
      return `${role}:\n${msg.content}\n`;
    })
    .join('\n---\n\n');

  const summariesText = conversationHistory.summaries
    ?.map((s: any) => s.content)
    .join('\n\n');

  // Prompt otimizado com Markdown
  const systemPrompt = `# Assistente Financeiro BPO

Você é um assistente financeiro especializado. Use **formatação Markdown** para tornar as respostas mais legíveis.

## Contexto Financeiro
**CNPJ:** \`${context.cnpj}\`

### Snapshot Recente
\`\`\`json
${JSON.stringify(context.snapshot, null, 2)}
\`\`\`

### DRE (Últimos 3 meses)
\`\`\`json
${JSON.stringify(context.dre, null, 2)}
\`\`\`

${context.external ? `### Dados Externos (${context.external.source.toUpperCase()})\n\`\`\`json\n${JSON.stringify(context.external.data, null, 2)}\n\`\`\`` : ''}

${summariesText ? `## Resumo de Conversas Anteriores\n${summariesText}` : ''}

${historyText ? `## Histórico Recente\n${historyText}` : ''}

## Instruções
- **Seja conciso**: Máximo 3-4 linhas
- **Use números reais** do contexto fornecido
- **Formate valores** com **negrito** (ex: **R$ 1.234,56**)
- Se dados insuficientes, informe que consultou APIs externas
- Use **emojis** financeiros quando apropriado (💰 💸 📊 📈 📉)
- Mantenha **memória** das conversas anteriores

---`;

  const userMessage = `**Pergunta:** ${question}`;

  // Escolher provedor baseado no modelo
  const modelName = selectedModel.model_name || 'claude-3-5-haiku-20241022';

  if (modelName.startsWith('gpt-')) {
    // OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    const answer = result.choices[0].message.content;
    const tokensInput = result.usage.prompt_tokens;
    const tokensOutput = result.usage.completion_tokens;

    // Calcular custo (valores aproximados)
    const costPer1kInput = modelName === 'gpt-4o-mini' ? 0.00015 : 0.005;
    const costPer1kOutput = modelName === 'gpt-4o-mini' ? 0.0006 : 0.015;
    const cost = (tokensInput / 1000) * costPer1kInput + (tokensOutput / 1000) * costPer1kOutput;

    return {
      answer,
      tokens: { input: tokensInput, output: tokensOutput },
      cost,
    };

  } else {
    // Anthropic (Claude)
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const result = await response.json();
    const answer = result.content[0].text;
    const tokensInput = result.usage.input_tokens;
    const tokensOutput = result.usage.output_tokens;

    // Calcular custo baseado no modelo
    let costPer1kInput = 0.001; // Haiku
    let costPer1kOutput = 0.005;

    if (modelName.includes('sonnet')) {
      costPer1kInput = 0.003;
      costPer1kOutput = 0.015;
    } else if (modelName.includes('opus')) {
      costPer1kInput = 0.015;
      costPer1kOutput = 0.075;
    }

    const cost = (tokensInput / 1000) * costPer1kInput + (tokensOutput / 1000) * costPer1kOutput;

    return {
      answer,
      tokens: { input: tokensInput, output: tokensOutput },
      cost,
    };
  }
}

// ========================================
// HANDLER PRINCIPAL
// ========================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  const startTime = Date.now();

  try {
    const { phone, message, cnpj } = await req.json();

    if (!phone || !message || !cnpj) {
      return new Response(
        JSON.stringify({ error: 'phone, message e cnpj são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseClient();

    // 1. Obter ou criar conversa
    const conversationId = await getOrCreateConversation(phone, cnpj);

    // 2. Adicionar mensagem do usuário ao contexto
    await addMessageToContext(conversationId, phone, cnpj, 'user', message);

    // 3. Atualizar analytics - mensagem do usuário
    await updateConversationAnalytics(
      conversationId, phone, cnpj, true, true, false, 0, 0, 0, null, null
    );

    // 4. Verificar cache
    const questionHash = hashQuestion(message);
    const { data: cached } = await supabase
      .from('ai_response_cache')
      .select('*')
      .eq('company_cnpj', onlyDigits(cnpj))
      .eq('question_hash', questionHash)
      .gt('cache_expires_at', new Date().toISOString())
      .single();

    let answer: string;
    let sourceData: any = null;
    let selectedModel: any = null;
    let tokensUsed = { input: 0, output: 0 };
    let costUsd = 0;
    let offTopic = false;

    if (cached) {
      // Usar resposta em cache
      answer = cached.answer_text;
      sourceData = cached.source_data;
    } else {
      // 5. Rotear para melhor modelo LLM
      selectedModel = await routeToOptimalLLM(message);

      // 6. Buscar contexto financeiro
      const context = await getClientContext(cnpj);

      // 7. Buscar histórico de conversa (context window 120)
      const conversationHistory = await getConversationContext(conversationId);

      // 8. Verificar se precisa consultar APIs externas
      const needsExternalData =
        message.toLowerCase().includes('tempo real') ||
        message.toLowerCase().includes('hoje') ||
        message.toLowerCase().includes('agora') ||
        !context.snapshot;

      if (needsExternalData) {
        const useF360 = message.toLowerCase().includes('transação') ||
                        message.toLowerCase().includes('pagamento');
        sourceData = await fetchExternalData(cnpj, useF360 ? 'f360' : 'omie', message);
      }

      // 9. Gerar resposta com IA
      const result = await generateAIResponse(
        message,
        { ...context, external: sourceData },
        conversationHistory,
        selectedModel
      );

      answer = result.answer;
      tokensUsed = result.tokens;
      costUsd = result.cost;
      offTopic = answer.includes('❌');

      // 10. Salvar no cache (válido por 1 hora)
      await supabase.from('ai_response_cache').insert({
        company_cnpj: onlyDigits(cnpj),
        question_hash: questionHash,
        question_text: message,
        answer_text: answer,
        source_data: sourceData,
        cache_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
    }

    // 11. Adicionar resposta ao contexto
    await addMessageToContext(
      conversationId,
      phone,
      cnpj,
      'assistant',
      answer,
      {
        model_selected: selectedModel?.model_name,
        rule_matched: selectedModel?.rule_matched,
        external_data_used: !!sourceData,
        cached: !!cached,
      },
      selectedModel?.model_name,
      costUsd
    );

    // 12. Atualizar analytics - resposta do bot
    const responseTimeSeconds = (Date.now() - startTime) / 1000;
    await updateConversationAnalytics(
      conversationId,
      phone,
      cnpj,
      false,
      !offTopic,
      offTopic,
      tokensUsed.input,
      tokensUsed.output,
      costUsd,
      selectedModel?.model_name,
      responseTimeSeconds
    );

    // 13. Registrar no llm_usage_logs (para tracking geral)
    if (selectedModel && !cached) {
      const { data: modelData } = await supabase
        .from('llm_models')
        .select('id')
        .eq('model_name', selectedModel.model_name)
        .single();

      if (modelData) {
        await supabase.from('llm_usage_logs').insert({
          llm_model_id: modelData.id,
          user_id: null, // WhatsApp não tem user_id
          request_type: 'whatsapp_bot',
          input_tokens: tokensUsed.input,
          output_tokens: tokensUsed.output,
          cost_usd: costUsd,
          success: !offTopic,
          response_time_ms: Math.round(responseTimeSeconds * 1000),
          metadata: {
            phone,
            cnpj: onlyDigits(cnpj),
            conversation_id: conversationId,
            rule_matched: selectedModel.rule_matched,
          },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        answer,
        cached: !!cached,
        model_used: selectedModel?.model_name || 'cached',
        rule_matched: selectedModel?.rule_matched || 'cache',
        tokens: tokensUsed,
        cost_usd: costUsd,
        response_time_seconds: responseTimeSeconds,
        source: sourceData ? 'external_api' : 'supabase',
        conversation_id: conversationId,
      }),
      { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('WhatsApp bot error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    );
  }
});
