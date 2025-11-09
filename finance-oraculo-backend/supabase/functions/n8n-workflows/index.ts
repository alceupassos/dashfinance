import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const N8N_URL = 'https://n8n.angrax.com.br';
const N8N_API_KEY = Deno.env.get('N8N_API_KEY') || '';

async function fetchN8N(endpoint: string, options: RequestInit = {}) {
  const url = `${N8N_URL}/api/v1${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`N8N API error: ${response.status} - ${error}`);
  }

  return response.json();
}

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

    const url = new URL(req.url);
    const method = req.method;
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // GET /n8n-workflows - Lista workflows
    if (method === 'GET' && pathParts.length === 1) {
      const workflows = await fetchN8N('/workflows');
      
      // Enriquece com dados do Supabase (últimas execuções)
      const enrichedWorkflows = await Promise.all(
        workflows.data.map(async (w: any) => {
          const { data: executions } = await supabase
            .from('automation_runs')
            .select('status, started_at, finished_at')
            .eq('workflow_id', w.id)
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            id: w.id,
            name: w.name,
            active: w.active,
            tags: w.tags || [],
            created_at: w.createdAt,
            updated_at: w.updatedAt,
            last_execution: executions ? {
              status: executions.status,
              started_at: executions.started_at,
              finished_at: executions.finished_at,
            } : null,
          };
        })
      );

      return new Response(
        JSON.stringify({
          workflows: enrichedWorkflows,
          total: enrichedWorkflows.length,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // POST /n8n-workflows/{id}/trigger - Força execução
    if (method === 'POST' && pathParts[1] === 'trigger') {
      const workflowId = pathParts[0];
      
      // Executar workflow no N8N
      const execution = await fetchN8N(`/workflows/${workflowId}/execute`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      // Log no Supabase
      await supabase.from('automation_runs').insert({
        workflow_id: workflowId,
        status: 'running',
        started_at: new Date().toISOString(),
        triggered_by: user.id,
      });

      return new Response(
        JSON.stringify({
          success: true,
          execution_id: execution.data?.id,
          message: 'Workflow executado com sucesso',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // PUT /n8n-workflows/{id} - Ativa/desativa
    if (method === 'PUT' && pathParts.length === 1) {
      const workflowId = pathParts[0];
      const body = await req.json();
      const { active } = body;

      // Atualiza no N8N
      await fetchN8N(`/workflows/${workflowId}`, {
        method: 'PUT',
        body: JSON.stringify({ active }),
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: `Workflow ${active ? 'ativado' : 'desativado'} com sucesso`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // GET /n8n-workflows/{id}/logs - Logs de execução
    if (method === 'GET' && pathParts[1] === 'logs') {
      const workflowId = pathParts[0];
      const limit = parseInt(url.searchParams.get('limit') || '10');

      const { data: logs } = await supabase
        .from('automation_runs')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('started_at', { ascending: false })
        .limit(limit);

      return new Response(
        JSON.stringify({
          logs: logs || [],
          total: logs?.length || 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ error: 'Rota não encontrada' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('N8N workflows error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

