// ===================================================
// Edge Function: admin/llm-config
// Configuração e métricas de LLM (apenas admin)
// Suporta múltiplos subendpoints via query param
// ===================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint');
    const month = url.searchParams.get('month');

    // ==================== GET /admin/llm-config?endpoint=providers ====================
    if (req.method === 'GET' && endpoint === 'providers') {
      const { data: providers, error } = await supabase
        .from('llm_providers')
        .select('*')
        .order('priority', { ascending: true });

      if (error) {
        console.error('List providers error:', error);
        return new Response(JSON.stringify({ error: 'Erro ao listar providers' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ providers: providers || [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ==================== GET /admin/llm-config?endpoint=models ====================
    if (req.method === 'GET' && endpoint === 'models') {
      const { data: models, error } = await supabase
        .from('llm_models')
        .select('*, llm_providers(provider_name, display_name)')
        .order('provider_id', { ascending: true })
        .order('model_name', { ascending: true });

      if (error) {
        console.error('List models error:', error);
        return new Response(JSON.stringify({ error: 'Erro ao listar modelos' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ models: models || [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ==================== GET /admin/llm-config?endpoint=contexts ====================
    if (req.method === 'GET' && endpoint === 'contexts') {
      // Retorna lista de contextos disponíveis (hardcoded por enquanto)
      const contexts = [
        { id: 'whatsapp_bot', label: 'WhatsApp Bot', description: 'Respostas automáticas via WhatsApp' },
        { id: 'analyze', label: 'Análise Financeira', description: 'Análises e insights sobre dados financeiros' },
        { id: 'reports', label: 'Relatórios', description: 'Geração de relatórios personalizados' },
        { id: 'support', label: 'Suporte', description: 'Atendimento e suporte ao cliente' },
      ];

      return new Response(JSON.stringify({ contexts }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ==================== GET /admin/llm-config?endpoint=usage&month=YYYY-MM ====================
    if (req.method === 'GET' && endpoint === 'usage') {
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return new Response(JSON.stringify({ error: 'Parâmetro month=YYYY-MM obrigatório' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const startDate = new Date(`${month}-01T00:00:00Z`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      // Buscar uso do mês
      const { data: usage, error } = await supabase
        .from('llm_usage')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lt('timestamp', endDate.toISOString());

      if (error) {
        console.error('List usage error:', error);
        return new Response(JSON.stringify({ error: 'Erro ao buscar uso' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Agregações
      const summary = {
        total_cost_usd: (usage || []).reduce((acc, u) => acc + Number(u.cost_usd), 0).toFixed(2),
        total_tokens_in: (usage || []).reduce((acc, u) => acc + u.tokens_input, 0),
        total_tokens_out: (usage || []).reduce((acc, u) => acc + u.tokens_output, 0),
      };

      // Por modelo
      const modelMap = new Map<string, { cost: number; tokens_in: number; tokens_out: number }>();
      (usage || []).forEach(u => {
        const key = `${u.provider}/${u.model}`;
        if (!modelMap.has(key)) {
          modelMap.set(key, { cost: 0, tokens_in: 0, tokens_out: 0 });
        }
        const stats = modelMap.get(key)!;
        stats.cost += Number(u.cost_usd);
        stats.tokens_in += u.tokens_input;
        stats.tokens_out += u.tokens_output;
      });

      const by_model = Array.from(modelMap.entries()).map(([model, stats]) => ({
        model,
        cost_usd: stats.cost.toFixed(2),
        tokens_in: stats.tokens_in,
        tokens_out: stats.tokens_out,
      }));

      // Por equipe
      const teamMap = new Map<string, number>();
      (usage || []).forEach(u => {
        const team = u.team || 'Sem equipe';
        teamMap.set(team, (teamMap.get(team) || 0) + Number(u.cost_usd));
      });

      const by_team = Array.from(teamMap.entries()).map(([team, cost]) => ({
        team,
        cost_usd: cost.toFixed(2),
      }));

      return new Response(JSON.stringify({ summary, by_model, by_team }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ==================== PUT /admin/llm-config - ATUALIZAR CONFIGURAÇÕES ====================
    if (req.method === 'PUT') {
      const { provider_id, model_id, updates } = await req.json();

      if (provider_id) {
        // Atualizar provider
        const { error: updateError } = await supabase
          .from('llm_providers')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', provider_id);

        if (updateError) {
          console.error('Update provider error:', updateError);
          return new Response(JSON.stringify({ error: 'Erro ao atualizar provider' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      if (model_id) {
        // Atualizar modelo
        const { error: updateError } = await supabase
          .from('llm_models')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', model_id);

        if (updateError) {
          console.error('Update model error:', updateError);
          return new Response(JSON.stringify({ error: 'Erro ao atualizar modelo' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ==================== ENDPOINT NÃO ENCONTRADO ====================
    return new Response(JSON.stringify({ error: 'Endpoint não encontrado' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Admin LLM config error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
