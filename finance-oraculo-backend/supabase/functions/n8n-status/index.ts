import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const N8N_URL = 'https://n8n.angrax.com.br';
const N8N_API_KEY = Deno.env.get('N8N_API_KEY') || '';

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

    // Buscar workflows do N8N
    const workflowsResponse = await fetch(`${N8N_URL}/api/v1/workflows`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
      },
    });

    const workflows = workflowsResponse.ok ? await workflowsResponse.json() : { data: [] };

    // Estatísticas de execuções (últimas 24h)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: executions } = await supabase
      .from('automation_runs')
      .select('status, started_at, finished_at')
      .gte('started_at', oneDayAgo.toISOString());

    const totalExecutions = executions?.length || 0;
    const successfulExecutions = executions?.filter(e => e.status === 'success').length || 0;
    const failedExecutions = executions?.filter(e => e.status === 'error').length || 0;
    const runningExecutions = executions?.filter(e => e.status === 'running').length || 0;

    const successRate = totalExecutions > 0 
      ? ((successfulExecutions / totalExecutions) * 100).toFixed(1)
      : '0';

    // Tempo médio de execução
    const completedExecutions = executions?.filter(e => e.finished_at) || [];
    const avgExecutionTime = completedExecutions.length > 0
      ? completedExecutions.reduce((acc, e) => {
          const start = new Date(e.started_at).getTime();
          const end = new Date(e.finished_at).getTime();
          return acc + (end - start);
        }, 0) / completedExecutions.length / 1000 // segundos
      : 0;

    // Status dos workflows
    const activeWorkflows = workflows.data?.filter((w: any) => w.active).length || 0;
    const totalWorkflows = workflows.data?.length || 0;

    return new Response(
      JSON.stringify({
        summary: {
          total_workflows: totalWorkflows,
          active_workflows: activeWorkflows,
          inactive_workflows: totalWorkflows - activeWorkflows,
          executions_24h: totalExecutions,
          success_rate: Number(successRate),
          avg_execution_time_sec: avgExecutionTime.toFixed(2),
        },
        executions: {
          total: totalExecutions,
          successful: successfulExecutions,
          failed: failedExecutions,
          running: runningExecutions,
        },
        health: {
          status: failedExecutions > 5 ? 'degraded' : 'healthy',
          n8n_reachable: workflowsResponse.ok,
          last_check: new Date().toISOString(),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('N8N status error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno',
        health: {
          status: 'error',
          n8n_reachable: false,
        },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

