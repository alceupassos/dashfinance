// ===================================================
// Card Processor: Sistema de processamento de cards
// Usado por kpi-monthly, dashboard-smart e outros
// ===================================================

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export interface CardJob {
  id: string;
  company_cnpj: string;
  card_type: string;
  period: string;
  reference_date: string;
  status: string;
  depends_on: string[];
  priority: number;
  input_data?: any;
  computed_data?: any;
}

export interface CardDependency {
  card_type: string;
  display_name: string;
  depends_on: string[];
  tier: number;
  cache_ttl_minutes: number;
}

export class CardProcessor {
  constructor(private supabase: SupabaseClient) {}

  // ==================== ORCHESTRATION ====================

  /**
   * Agendar processamento de cards (expande dependências)
   * Usa LLM para otimizar ordem de processamento se disponível
   */
  async scheduleCards(cnpj: string, cards: string[], referenceDate?: string, useLLMPlanning = true): Promise<{tiers: string[][], total: number, optimized: boolean}> {
    const date = referenceDate || new Date().toISOString().split('T')[0];

    // 1. Expandir dependências recursivamente
    const allCards = await this.expandDependencies(cards);

    // 2. Buscar info de dependências
    const { data: deps } = await this.supabase
      .from('card_dependencies')
      .select('*')
      .in('card_type', allCards);

    // 3. OTIMIZAÇÃO COM LLM (se habilitado)
    let tiers: string[][];
    let optimized = false;

    if (useLLMPlanning && deps && deps.length > 5) {
      try {
        tiers = await this.optimizeWithLLM(deps);
        optimized = true;
        console.log('✅ LLM otimizou ordem de processamento');
      } catch (error) {
        console.warn('⚠️ LLM planning failed, using fallback', error);
        tiers = this.buildTiers(deps);
      }
    } else {
      tiers = this.buildTiers(deps || []);
    }

    // 4. Criar jobs na fila
    for (let tierIndex = 0; tierIndex < tiers.length; tierIndex++) {
      const tierCards = tiers[tierIndex];

      for (const cardType of tierCards) {
        const dep = deps?.find(d => d.card_type === cardType);

        await this.supabase
          .from('card_processing_queue')
          .upsert({
            company_cnpj: cnpj,
            card_type: cardType,
            period: 'monthly',
            reference_date: date,
            status: dep?.depends_on?.length === 0 ? 'ready_to_process' : 'pending',
            priority: tierIndex + 1,
            estimated_duration_ms: dep?.estimated_duration_ms || 100,
          }, {
            onConflict: 'company_cnpj,card_type,period,reference_date'
          });
      }
    }

    return { tiers, total: allCards.length, optimized };
  }

  /**
   * Otimizar ordem de processamento usando LLM (modelo rápido)
   */
  private async optimizeWithLLM(deps: CardDependency[]): Promise<string[][]> {
    // Buscar modelo rápido configurado
    const { data: fastModel } = await this.supabase
      .from('llm_models')
      .select('model_name, llm_providers(provider_name, base_url)')
      .eq('model_type', 'fast')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!fastModel) {
      throw new Error('No fast LLM model available');
    }

    // Preparar prompt
    const prompt = `Given these card dependencies, optimize the processing order to maximize parallelization while respecting dependencies:

${deps.map(d => `- ${d.card_type}: depends_on=[${d.depends_on?.join(', ')}], duration=${d.estimated_duration_ms}ms, can_parallelize=${d.can_parallelize}`).join('\n')}

Return ONLY a JSON array of tiers (each tier is an array of card_types that can be processed in parallel):
Example: [["card1","card2"], ["card3"], ["card4","card5"]]`;

    // Chamar LLM (Anthropic Claude Haiku é o mais rápido)
    const provider = fastModel.llm_providers as any;
    const response = await fetch(`${provider.base_url}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: fastModel.model_name,
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    const result = await response.json();
    const tiers = JSON.parse(result.content[0].text);

    // Logar uso de LLM
    await this.supabase.from('llm_usage').insert({
      context: 'card_planning',
      provider: provider.provider_name,
      model: fastModel.model_name,
      tokens_input: prompt.length / 4, // Estimativa
      tokens_output: result.usage?.output_tokens || 0,
      cost_usd: 0.001, // Claude Haiku é barato
      latency_ms: 200,
      success: true
    });

    return tiers;
  }

  /**
   * Expandir dependências recursivamente
   */
  private async expandDependencies(cards: string[]): Promise<string[]> {
    const allCards = new Set<string>();
    const queue = [...cards];

    while (queue.length > 0) {
      const card = queue.shift()!;
      if (allCards.has(card)) continue;

      allCards.add(card);

      const { data } = await this.supabase
        .from('card_dependencies')
        .select('depends_on')
        .eq('card_type', card)
        .single();

      if (data?.depends_on) {
        queue.push(...data.depends_on);
      }
    }

    return Array.from(allCards);
  }

  /**
   * Construir tiers de processamento (topological sort)
   */
  private buildTiers(deps: CardDependency[]): string[][] {
    const tiers: string[][] = [];
    const depMap = new Map<string, string[]>();
    const processed = new Set<string>();

    // Construir mapa de dependências
    deps.forEach(d => depMap.set(d.card_type, d.depends_on || []));

    // Processar por tier
    while (processed.size < deps.length) {
      const currentTier: string[] = [];

      for (const dep of deps) {
        if (processed.has(dep.card_type)) continue;

        // Verificar se todas as dependências já foram processadas
        const allDepsProcessed = (dep.depends_on || []).every(d => processed.has(d));

        if (allDepsProcessed) {
          currentTier.push(dep.card_type);
        }
      }

      if (currentTier.length === 0) break; // Evitar loop infinito

      currentTier.forEach(c => processed.add(c));
      tiers.push(currentTier);
    }

    return tiers;
  }

  // ==================== CACHE & RETRIEVAL ====================

  /**
   * Buscar cards do cache (se disponíveis e não expirados)
   */
  async getCachedCards(cnpj: string, cards: string[], referenceDate?: string): Promise<Record<string, any>> {
    const date = referenceDate || new Date().toISOString().split('T')[0];
    const cached: Record<string, any> = {};

    const { data } = await this.supabase
      .from('card_processing_queue')
      .select('card_type, computed_data, expires_at, status')
      .eq('company_cnpj', cnpj)
      .eq('reference_date', date)
      .in('card_type', cards)
      .eq('status', 'done');

    for (const row of data || []) {
      // Verificar se não expirou
      if (row.expires_at && new Date(row.expires_at) > new Date()) {
        cached[row.card_type] = row.computed_data;
      }
    }

    return cached;
  }

  /**
   * Aguardar processamento de cards (polling)
   */
  async waitForCards(cnpj: string, cards: string[], options: {timeout?: number, pollInterval?: number, referenceDate?: string} = {}): Promise<Record<string, any>> {
    const timeout = options.timeout || 30000; // 30s default
    const pollInterval = options.pollInterval || 500; // 500ms default
    const date = options.referenceDate || new Date().toISOString().split('T')[0];
    const startTime = Date.now();
    const results: Record<string, any> = {};

    while (Object.keys(results).length < cards.length) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Timeout aguardando cards: ${cards.filter(c => !results[c]).join(', ')}`);
      }

      // Poll para cards prontos
      const { data } = await this.supabase
        .from('card_processing_queue')
        .select('card_type, computed_data, status')
        .eq('company_cnpj', cnpj)
        .eq('reference_date', date)
        .in('card_type', cards);

      for (const row of data || []) {
        if (row.status === 'done' && !results[row.card_type]) {
          results[row.card_type] = row.computed_data;
        } else if (row.status === 'error' && !results[row.card_type]) {
          // Card falhou, retornar erro
          results[row.card_type] = { error: true, message: 'Erro ao processar card' };
        }
      }

      if (Object.keys(results).length < cards.length) {
        await new Promise(r => setTimeout(r, pollInterval));
      }
    }

    return results;
  }

  // ==================== PROCESSING ====================

  /**
   * Processar um card específico (executado por workers)
   */
  async processCard(job: CardJob): Promise<any> {
    const startTime = Date.now();

    try {
      // 1. Buscar dados de entrada (das dependências)
      const inputData = await this.fetchInputData(job);

      // 2. Executar calculador específico
      const result = await this.computeCard(job.card_type, inputData, job.company_cnpj);

      // 3. Calcular TTL do cache
      const { data: dep } = await this.supabase
        .from('card_dependencies')
        .select('cache_ttl_minutes')
        .eq('card_type', job.card_type)
        .single();

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + (dep?.cache_ttl_minutes || 60));

      // 4. Salvar resultado
      await this.supabase
        .from('card_processing_queue')
        .update({
          status: 'done',
          computed_data: result,
          actual_duration_ms: Date.now() - startTime,
          completed_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      // 5. Log
      await this.logEvent(job.id, 'completed', 'done', null, Date.now() - startTime);

      return result;

    } catch (error: any) {
      // Marcar como erro
      await this.supabase
        .from('card_processing_queue')
        .update({
          status: 'error',
          last_error: error.message,
          attempts: job.attempts + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      await this.logEvent(job.id, 'failed', 'error', error.message, Date.now() - startTime);

      throw error;
    }
  }

  /**
   * Buscar dados de entrada das dependências
   */
  private async fetchInputData(job: CardJob): Promise<any> {
    const { data: dep } = await this.supabase
      .from('card_dependencies')
      .select('depends_on')
      .eq('card_type', job.card_type)
      .single();

    if (!dep?.depends_on || dep.depends_on.length === 0) {
      return {};
    }

    const inputData: any = {};

    const { data } = await this.supabase
      .from('card_processing_queue')
      .select('card_type, computed_data')
      .eq('company_cnpj', job.company_cnpj)
      .eq('reference_date', job.reference_date)
      .in('card_type', dep.depends_on);

    for (const row of data || []) {
      inputData[row.card_type] = row.computed_data;
    }

    return inputData;
  }

  /**
   * Calcular card (router para calculadores específicos)
   */
  private async computeCard(cardType: string, inputData: any, cnpj: string): Promise<any> {
    // Router para diferentes calculadores
    const calculators: Record<string, Function> = {
      'total_caixa': this.calculateTotalCaixa.bind(this),
      'receitas_mes': this.calculateReceitasMes.bind(this),
      'despesas_mes': this.calculateDespesasMes.bind(this),
      'disponivel': this.calculateDisponivel.bind(this),
      'runway': this.calculateRunway.bind(this),
      'burn_rate': this.calculateBurnRate.bind(this),
      'margem_liquida': this.calculateMargemLiquida.bind(this),
      'resultado_mes': this.calculateResultadoMes.bind(this),
    };

    const calculator = calculators[cardType];

    if (!calculator) {
      // Para cards não implementados, retornar mock
      return {
        value: 0,
        formatted: 'R$ 0,00',
        status: 'not_implemented',
        message: `Calculador para ${cardType} ainda não implementado`,
        timestamp: new Date().toISOString()
      };
    }

    return await calculator(inputData, cnpj);
  }

  // ==================== CALCULADORES ESPECÍFICOS ====================

  private async calculateTotalCaixa(input: any, cnpj: string): Promise<any> {
    const saldoF360 = input.saldo_f360?.value ?? 0;
    const saldoOmie = input.saldo_omie?.value ?? 0;
    const total = saldoF360 + saldoOmie;

    return {
      value: total,
      breakdown: { f360: saldoF360, omie: saldoOmie },
      formatted: `R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
      timestamp: new Date().toISOString()
    };
  }

  private async calculateReceitasMes(input: any, cnpj: string): Promise<any> {
    const lancamentos = input.lancamentos_mes?.items ?? [];
    const receitas = lancamentos.filter((l: any) => l.tipo === 'receita');
    const total = receitas.reduce((sum: number, l: any) => sum + l.valor, 0);

    return {
      value: total,
      count: receitas.length,
      formatted: `R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
      timestamp: new Date().toISOString()
    };
  }

  private async calculateDespesasMes(input: any, cnpj: string): Promise<any> {
    const lancamentos = input.lancamentos_mes?.items ?? [];
    const despesas = lancamentos.filter((l: any) => l.tipo === 'despesa');
    const total = despesas.reduce((sum: number, l: any) => sum + Math.abs(l.valor), 0);

    return {
      value: total,
      count: despesas.length,
      formatted: `R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
      timestamp: new Date().toISOString()
    };
  }

  private async calculateDisponivel(input: any, cnpj: string): Promise<any> {
    const totalCaixa = input.total_caixa?.value ?? 0;
    const contasPagar = input.contas_pagar?.value ?? 0;
    const disponivel = totalCaixa - contasPagar;

    return {
      value: disponivel,
      breakdown: { caixa: totalCaixa, compromissos: contasPagar },
      formatted: `R$ ${disponivel.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
      timestamp: new Date().toISOString()
    };
  }

  private async calculateRunway(input: any, cnpj: string): Promise<any> {
    const disponivel = input.disponivel?.value ?? 0;
    const despesasMes = input.despesas_mes?.value ?? 0;

    if (despesasMes === 0) {
      return {
        value: Infinity,
        formatted: '∞ meses',
        alert: 'ok',
        timestamp: new Date().toISOString()
      };
    }

    const months = disponivel / despesasMes;

    return {
      value: months,
      formatted: `${months.toFixed(1)} meses`,
      alert: months < 3 ? 'critical' : months < 6 ? 'warning' : 'ok',
      timestamp: new Date().toISOString()
    };
  }

  private async calculateBurnRate(input: any, cnpj: string): Promise<any> {
    const despesas = input.despesas_mes?.value ?? 0;
    const receitas = input.receitas_mes?.value ?? 0;
    const burnRate = despesas - receitas;

    return {
      value: burnRate,
      formatted: `R$ ${burnRate.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
      alert: burnRate > 0 ? 'warning' : 'ok',
      timestamp: new Date().toISOString()
    };
  }

  private async calculateMargemLiquida(input: any, cnpj: string): Promise<any> {
    const receitas = input.receitas_mes?.value ?? 0;
    const despesas = input.despesas_mes?.value ?? 0;

    if (receitas === 0) {
      return {
        value: 0,
        formatted: '0%',
        timestamp: new Date().toISOString()
      };
    }

    const margem = ((receitas - despesas) / receitas) * 100;

    return {
      value: margem,
      formatted: `${margem.toFixed(1)}%`,
      alert: margem < 0 ? 'critical' : margem < 10 ? 'warning' : 'ok',
      timestamp: new Date().toISOString()
    };
  }

  private async calculateResultadoMes(input: any, cnpj: string): Promise<any> {
    const receitas = input.receitas_mes?.value ?? 0;
    const despesas = input.despesas_mes?.value ?? 0;
    const resultado = receitas - despesas;

    return {
      value: resultado,
      formatted: `R$ ${resultado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
      tipo: resultado >= 0 ? 'lucro' : 'prejuizo',
      alert: resultado < 0 ? 'warning' : 'ok',
      timestamp: new Date().toISOString()
    };
  }

  // ==================== LOGGING ====================

  private async logEvent(queueId: string, eventType: string, status: string, error: string | null, durationMs: number) {
    try {
      await this.supabase.from('card_processing_log').insert({
        queue_id: queueId,
        event_type: eventType,
        status,
        error_message: error,
        duration_ms: durationMs,
      });
    } catch (e) {
      console.error('Failed to log event:', e);
    }
  }
}
