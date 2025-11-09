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
    const userId = url.searchParams.get('user_id');
    const empresaId = url.searchParams.get('empresa_id');
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    const activityType = url.searchParams.get('activity_type'); // pages, api_calls, llm, whatsapp

    // Período padrão: últimos 30 dias
    const defaultDateFrom = new Date();
    defaultDateFrom.setDate(defaultDateFrom.getDate() - 30);
    const from = dateFrom || defaultDateFrom.toISOString().split('T')[0];
    const to = dateTo || new Date().toISOString().split('T')[0];

    // Buscar dados de uso
    let query = supabase
      .from('user_system_usage')
      .select(`
        *,
        profiles (
          id,
          email,
          full_name
        )
      `)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (empresaId) {
      query = query.eq('empresa_id', empresaId);
    }

    const { data: usageData, error: usageError } = await query;

    if (usageError) {
      throw usageError;
    }

    // Agregar por usuário
    const usageByUser = new Map();

    (usageData || []).forEach((u: any) => {
      const userId = u.user_id;
      if (!usageByUser.has(userId)) {
        usageByUser.set(userId, {
          user_id: userId,
          email: u.profiles?.email || 'Desconhecido',
          full_name: u.profiles?.full_name || 'Desconhecido',
          sessions: 0,
          total_time_minutes: 0,
          pages_visited: [],
          api_calls: 0,
          llm_interactions: 0,
          llm_tokens: 0,
          llm_cost: 0,
          whatsapp_sent: 0,
          whatsapp_received: 0,
        });
      }

      const userStats = usageByUser.get(userId);
      userStats.sessions += u.sessions || 0;
      userStats.total_time_minutes += u.total_time_minutes || 0;
      userStats.api_calls += u.api_calls_count || 0;
      userStats.llm_interactions += u.llm_interactions || 0;
      userStats.llm_tokens += u.llm_tokens_used || 0;
      userStats.llm_cost += u.llm_cost_usd || 0;
      userStats.whatsapp_sent += u.whatsapp_messages_sent || 0;
      userStats.whatsapp_received += u.whatsapp_messages_received || 0;
      
      // Merge páginas visitadas
      if (u.pages_visited) {
        userStats.pages_visited = [...userStats.pages_visited, ...u.pages_visited];
      }
    });

    // Converter para array e calcular top páginas
    const usageDetails = Array.from(usageByUser.values()).map((user: any) => {
      // Top 5 páginas mais visitadas
      const pageCount = new Map();
      user.pages_visited.forEach((page: string) => {
        pageCount.set(page, (pageCount.get(page) || 0) + 1);
      });

      const topPages = Array.from(pageCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([page, count]) => ({ page, visits: count }));

      return {
        ...user,
        top_pages: topPages,
        avg_session_minutes: user.sessions > 0 
          ? (user.total_time_minutes / user.sessions).toFixed(1)
          : '0',
      };
    });

    // Filtrar por tipo de atividade se especificado
    let filteredDetails = usageDetails;
    if (activityType === 'pages') {
      filteredDetails = usageDetails.filter(u => u.pages_visited.length > 0);
    } else if (activityType === 'api_calls') {
      filteredDetails = usageDetails.filter(u => u.api_calls > 0);
    } else if (activityType === 'llm') {
      filteredDetails = usageDetails.filter(u => u.llm_interactions > 0);
    } else if (activityType === 'whatsapp') {
      filteredDetails = usageDetails.filter(u => u.whatsapp_sent > 0 || u.whatsapp_received > 0);
    }

    // Timeline de uso (por dia)
    const timelineMap = new Map();
    (usageData || []).forEach((u: any) => {
      const date = u.date;
      if (!timelineMap.has(date)) {
        timelineMap.set(date, {
          date,
          sessions: 0,
          api_calls: 0,
          llm_tokens: 0,
          whatsapp_messages: 0,
        });
      }

      const dayStats = timelineMap.get(date);
      dayStats.sessions += u.sessions || 0;
      dayStats.api_calls += u.api_calls_count || 0;
      dayStats.llm_tokens += u.llm_tokens_used || 0;
      dayStats.whatsapp_messages += (u.whatsapp_messages_sent || 0) + (u.whatsapp_messages_received || 0);
    });

    const timeline = Array.from(timelineMap.values()).sort((a, b) => 
      a.date.localeCompare(b.date)
    );

    return new Response(
      JSON.stringify({
        usage_details: filteredDetails,
        timeline,
        period: { from, to },
        total_users: filteredDetails.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Usage details error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

