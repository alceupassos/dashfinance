// =====================================================
// LLM ROUTER - Roteia entre Haiku 3.5 e ChatGPT 5 HIGH
// =====================================================

import { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export interface LLMRequest {
  prompt: string;
  prompt_class?: 'simples' | 'complexa' | 'analise';
  config?: LLMConfig;
}

export interface LLMConfig {
  modelo_simples?: string;
  modelo_complexo?: string;
  temperatura_simples?: number;
  temperatura_complexa?: number;
}

export interface LLMResponse {
  modelo_usado: string;
  resposta: string;
  tokens_in: number;
  tokens_out: number;
  latencia_ms: number;
  temperatura: number;
}

/**
 * Detecta classe do prompt automaticamente
 */
function detectPromptClass(prompt: string): 'simples' | 'complexa' | 'analise' {
  const tokenCount = prompt.split(/\s+/).length;
  const complexKeywords = ['compare', 'analisa', 'tendência', 'projeção', 'recomend', 'estratég', 'por que', 'como'];
  
  // Simples: < 40 tokens e sem palavras complexas
  if (tokenCount < 40 && !complexKeywords.some(kw => prompt.toLowerCase().includes(kw))) {
    return 'simples';
  }
  
  // Análise: contém várias palavras complexas
  if (complexKeywords.filter(kw => prompt.toLowerCase().includes(kw)).length >= 2) {
    return 'analise';
  }
  
  return 'complexa';
}

/**
 * Router principal de LLM
 */
export async function routeLLM(
  request: LLMRequest,
  supabase: SupabaseClient,
  automation_run_id?: string
): Promise<LLMResponse> {
  const startTime = Date.now();
  
  // Detectar classe se não informada
  const promptClass = request.prompt_class || detectPromptClass(request.prompt);
  const config = request.config || {
    modelo_simples: 'gpt-4o',
    modelo_complexo: 'gpt-4o',
    temperatura_simples: 0.3,
    temperatura_complexa: 0.7,
  };

  console.log(`🤖 LLM Router: ${promptClass} → ${promptClass === 'simples' ? config.modelo_simples : config.modelo_complexo}`);

  let modelo: string;
  let temperatura: number;

  if (promptClass === 'simples') {
    modelo = config.modelo_simples || 'gpt-4o';
    temperatura = config.temperatura_simples || 0.3;
  } else {
    modelo = config.modelo_complexo || 'gpt-4o';
    temperatura = config.temperatura_complexa || 0.7;
  }

  try {
    let resposta: string;
    let tokensIn = 0;
    let tokensOut = 0;

    // Chamar modelo apropriado
    if (modelo.includes('haiku')) {
      ({ resposta, tokensIn, tokensOut } = await callHaiku(request.prompt, temperatura));
    } else if (modelo.includes('gpt') || modelo.includes('chatgpt')) {
      ({ resposta, tokensIn, tokensOut } = await callChatGPT5(request.prompt, temperatura));
    } else {
      throw new Error(`Modelo desconhecido: ${modelo}`);
    }

    const latencia = Date.now() - startTime;

    // Registrar chamada LLM
    if (automation_run_id) {
      await supabase.from('llm_calls').insert({
        automation_run_id,
        workflow_name: 'llm-router',
        modelo,
        prompt_class: promptClass,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        status: 'success',
        resposta,
        latencia_ms: latencia,
        temperatura,
      });
    }

    console.log(`✅ LLM ${modelo} executado em ${latencia}ms`);

    return {
      modelo_usado: modelo,
      resposta,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      latencia_ms: latencia,
      temperatura,
    };

  } catch (error) {
    console.error(`❌ Erro LLM: ${error.message}`);

    // Registrar falha
    if (automation_run_id) {
      await supabase.from('llm_calls').insert({
        automation_run_id,
        workflow_name: 'llm-router',
        modelo,
        prompt_class: promptClass,
        status: 'failed',
        erro: error.message,
        latencia_ms: Date.now() - startTime,
        temperatura,
      });
    }

    // Fallback para Haiku se ChatGPT falhar
    if (modelo.includes('gpt')) {
      console.log('⚠️ Fallback para Haiku 3.5...');
      const fallback = await callHaiku(request.prompt, 0.3);
      
      if (automation_run_id) {
        await supabase.from('llm_calls').insert({
          automation_run_id,
          workflow_name: 'llm-router-fallback',
          modelo: 'haiku-3.5',
          prompt_class: promptClass,
          tokens_in: fallback.tokensIn,
          tokens_out: fallback.tokensOut,
          status: 'success',
          resposta: fallback.resposta + '\n\n⚠️ _(Resposta simplificada - Sistema ChatGPT indisponível)_',
          latencia_ms: Date.now() - startTime,
          temperatura: 0.3,
        });
      }
      
      return {
        modelo_usado: 'haiku-3.5 (fallback)',
        resposta: fallback.resposta + '\n\n⚠️ _(Resposta simplificada - Sistema indisponível)_',
        tokens_in: fallback.tokensIn,
        tokens_out: fallback.tokensOut,
        latencia_ms: Date.now() - startTime,
        temperatura: 0.3,
      };
    }

    throw error;
  }
}

/**
 * Chama Claude Haiku 3.5
 */
async function callHaiku(
  prompt: string,
  temperatura: number
): Promise<{ resposta: string; tokensIn: number; tokensOut: number }> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY não configurada');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      temperature: temperatura,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Haiku API error: ${data.error?.message || response.statusText}`);
  }

  return {
    resposta: data.content[0].text,
    tokensIn: data.usage.input_tokens,
    tokensOut: data.usage.output_tokens,
  };
}

/**
 * Chama ChatGPT 5 HIGH
 */
async function callChatGPT5(
  prompt: string,
  temperatura: number
): Promise<{ resposta: string; tokensIn: number; tokensOut: number }> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY não configurada');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em análise financeira com acesso a dados de empresas brasileiras. Forneça análises profundas, precisas e acionáveis. Use formatação clara com emojis quando apropriado.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: temperatura,
      max_tokens: 2048,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`ChatGPT API error: ${data.error?.message || response.statusText}`);
  }

  return {
    resposta: data.choices[0].message.content,
    tokensIn: data.usage.prompt_tokens,
    tokensOut: data.usage.completion_tokens,
  };
}

/**
 * Formata resposta da LLM para WhatsApp
 */
export function formatLLMResponse(
  resposta: string,
  modelo: string,
  forWhatsApp: boolean = true
): string {
  if (!forWhatsApp) {
    return resposta;
  }

  // Limpar resposta
  let formatted = resposta.trim();

  // Quebrar linhas longas
  formatted = formatted
    .split('\n')
    .map(line => {
      if (line.length > 80) {
        return line.match(/.{1,80}/g)?.join('\n') || line;
      }
      return line;
    })
    .join('\n');

  // Adicionar rodapé com modelo
  formatted += `\n\n_Análise gerada por ${modelo}_`;

  return formatted;
}

/**
 * Detecta falhas de modelo e trata
 */
export async function handleLLMError(
  error: Error,
  modelo: string,
  supabase: SupabaseClient,
  config_automacoes_id?: string
): Promise<string> {
  console.error(`❌ Erro LLM ${modelo}:`, error.message);

  // Registrar falha
  if (config_automacoes_id) {
    await supabase.from('automation_failures').insert({
      config_automacoes_id,
      tipo_erro: 'LLM_ERROR',
      mensagem: `Modelo ${modelo} falhou: ${error.message}`,
      stack_trace: error.stack,
    });
  }

  // Resposta padrão amigável
  return `⚠️ Desculpe, houve um problema ao processar sua análise. Estamos investigando. Tente novamente em alguns instantes.`;
}

