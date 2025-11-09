import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verifica autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verifica se é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse query params
    const url = new URL(req.url);
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    const empresaId = url.searchParams.get('empresa_id');

    // Período padrão: últimos 30 dias
    const defaultDateFrom = new Date();
    defaultDateFrom.setDate(defaultDateFrom.getDate() - 30);
    const from = dateFrom || defaultDateFrom.toISOString().split('T')[0];
    const to = dateTo || new Date().toISOString().split('T')[0];

    // Buscar uso de LLM
    let query = supabase
      .from('llm_token_usage')
      .select('*')
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at', { ascending: false });

    if (empresaId) {
      query = query.eq('company_id', empresaId);
    }

    const { data: usage, error: usageError } = await query;

    if (usageError) {
      throw usageError;
    }

    // Agregar métricas por provider
    const metricsByProvider = new Map();

    (usage || []).forEach((u: any) => {
      const provider = u.provider || 'unknown';
      if (!metricsByProvider.has(provider)) {
        metricsByProvider.set(provider, {
          provider,
          model: u.model,
          total_requests: 0,
          total_tokens: 0,
          total_cost_usd: 0,
          avg_tokens_per_request: 0,
          avg_latency_ms: 0,
          error_count: 0,
        });
      }

      const metrics = metricsByProvider.get(provider);
      metrics.total_requests += 1;
      metrics.total_tokens += u.tokens_used || 0;
      metrics.total_cost_usd += u.cost_usd || 0;
      metrics.avg_latency_ms += u.latency_ms || 0;
      if (u.status === 'error') metrics.error_count += 1;
    });

    // Calcular médias
    const providerMetrics = Array.from(metricsByProvider.values()).map((m: any) => ({
      ...m,
      avg_tokens_per_request: (m.total_tokens / m.total_requests).toFixed(0),
      avg_latency_ms: (m.avg_latency_ms / m.total_requests).toFixed(0),
      cost_per_request: (m.total_cost_usd / m.total_requests).toFixed(4),
      error_rate: ((m.error_count / m.total_requests) * 100).toFixed(1),
    }));

    // Buscar configuração de preços para comparação
    const { data: pricingConfig } = await supabase
      .from('llm_pricing_config')
      .select('*')
      .order('created_at', { ascending: false });

    // Comparação de modelos (preço vs performance)
    const modelComparison = providerMetrics.map((m: any) => {
      const pricing = pricingConfig?.find(p => p.provider === m.provider && p.model === m.model);
      
      return {
        provider: m.provider,
        model: m.model,
        current_cost_per_request: Number(m.cost_per_request),
        current_latency_ms: Number(m.avg_latency_ms),
        current_error_rate: Number(m.error_rate),
        pricing_config: pricing || null,
      };
    });

    // Recomendações de otimização
    const recommendations = [];

    // Se Anthropic é mais usado mas OpenAI seria mais barato para tarefas simples
    const anthropicUsage = providerMetrics.find((m: any) => m.provider === 'anthropic');
    const openaiUsage = providerMetrics.find((m: any) => m.provider === 'openai');

    if (anthropicUsage && anthropicUsage.avg_tokens_per_request < 500) {
      recommendations.push({
        type: 'cost_optimization',
        severity: 'medium',
        message: 'Considere usar GPT-3.5 Turbo para requests com <500 tokens (mais barato)',
        potential_savings_usd_month: (anthropicUsage.total_cost_usd * 0.4).toFixed(2),
      });
    }

    if (providerMetrics.some((m: any) => m.error_rate > 5)) {
      recommendations.push({
        type: 'reliability',
        severity: 'high',
        message: 'Taxa de erro elevada (>5%). Revisar rate limits e fallbacks',
        potential_savings_usd_month: '0',
      });
    }

    // Timeline de uso
    const timelineMap = new Map();
    (usage || []).forEach((u: any) => {
      const date = u.created_at.split('T')[0];
      if (!timelineMap.has(date)) {
        timelineMap.set(date, {
          date,
          tokens: 0,
          cost_usd: 0,
          requests: 0,
        });
      }

      const day = timelineMap.get(date);
      day.tokens += u.tokens_used || 0;
      day.cost_usd += u.cost_usd || 0;
      day.requests += 1;
    });

    const timeline = Array.from(timelineMap.values()).sort((a, b) => 
      a.date.localeCompare(b.date)
    );

    return new Response(
      JSON.stringify({
        metrics_by_provider: providerMetrics,
        model_comparison: modelComparison,
        recommendations,
        timeline,
        summary: {
          total_requests: usage?.length || 0,
          total_tokens: usage?.reduce((acc, u) => acc + (u.tokens_used || 0), 0) || 0,
          total_cost_usd: usage?.reduce((acc, u) => acc + (u.cost_usd || 0), 0).toFixed(2) || '0',
          avg_cost_per_request: usage?.length > 0 
            ? (usage.reduce((acc: number, u: any) => acc + (u.cost_usd || 0), 0) / usage.length).toFixed(4)
            : '0',
        },
        period: { from, to },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('LLM metrics error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

