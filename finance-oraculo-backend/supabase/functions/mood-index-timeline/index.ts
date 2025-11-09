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

    // Parse query params
    const url = new URL(req.url);
    const empresaId = url.searchParams.get('empresa_id');
    const cnpj = url.searchParams.get('cnpj');
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    const granularity = url.searchParams.get('granularity') || 'daily'; // daily, weekly, monthly

    // Período padrão: últimos 30 dias
    const defaultDateFrom = new Date();
    defaultDateFrom.setDate(defaultDateFrom.getDate() - 30);
    const from = dateFrom || defaultDateFrom.toISOString().split('T')[0];
    const to = dateTo || new Date().toISOString().split('T')[0];

    // Buscar dados da timeline
    let query = supabase
      .from('whatsapp_mood_index_timeline')
      .select('*')
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true });

    if (cnpj) {
      query = query.eq('company_cnpj', cnpj);
    } else if (empresaId) {
      // Buscar CNPJ da empresa
      const { data: empresa } = await supabase
        .from('grupos')
        .select('cnpj')
        .eq('id', empresaId)
        .single();
      
      if (empresa?.cnpj) {
        query = query.eq('company_cnpj', empresa.cnpj);
      }
    }

    const { data: timeline, error: timelineError } = await query;

    if (timelineError) {
      throw timelineError;
    }

    // Processar dados baseado na granularidade
    let processedTimeline = timeline || [];

    if (granularity === 'weekly') {
      // Agrupar por semana
      const weeklyData = new Map();
      processedTimeline.forEach((t: any) => {
        const date = new Date(t.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Domingo
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weeklyData.has(weekKey)) {
          weeklyData.set(weekKey, {
            date: weekKey,
            mood_indices: [],
            conversation_counts: [],
          });
        }

        const week = weeklyData.get(weekKey);
        week.mood_indices.push(t.avg_mood_index);
        week.conversation_counts.push(t.conversation_count);
      });

      processedTimeline = Array.from(weeklyData.values()).map(w => ({
        date: w.date,
        avg_mood_index: w.mood_indices.reduce((a: number, b: number) => a + b, 0) / w.mood_indices.length,
        conversation_count: w.conversation_counts.reduce((a: number, b: number) => a + b, 0),
        min_mood_index: Math.min(...w.mood_indices),
        max_mood_index: Math.max(...w.mood_indices),
      }));
    } else if (granularity === 'monthly') {
      // Agrupar por mês
      const monthlyData = new Map();
      processedTimeline.forEach((t: any) => {
        const monthKey = t.date.slice(0, 7); // YYYY-MM

        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, {
            date: monthKey,
            mood_indices: [],
            conversation_counts: [],
          });
        }

        const month = monthlyData.get(monthKey);
        month.mood_indices.push(t.avg_mood_index);
        month.conversation_counts.push(t.conversation_count);
      });

      processedTimeline = Array.from(monthlyData.values()).map(m => ({
        date: m.date,
        avg_mood_index: m.mood_indices.reduce((a: number, b: number) => a + b, 0) / m.mood_indices.length,
        conversation_count: m.conversation_counts.reduce((a: number, b: number) => a + b, 0),
        min_mood_index: Math.min(...m.mood_indices),
        max_mood_index: Math.max(...m.mood_indices),
      }));
    }

    // Detectar alertas (quedas/recuperações)
    const alerts = [];
    for (let i = 3; i < processedTimeline.length; i++) {
      const current = processedTimeline[i].avg_mood_index;
      const threeDaysAgo = processedTimeline[i - 3].avg_mood_index;
      const change = ((current - threeDaysAgo) / threeDaysAgo) * 100;

      if (change <= -20) {
        alerts.push({
          type: 'drop',
          date: processedTimeline[i].date,
          change_percent: change.toFixed(1),
          severity: 'high',
          message: `Queda de ${Math.abs(change).toFixed(1)}% no humor em 3 dias`,
        });
      } else if (change >= 15) {
        alerts.push({
          type: 'recovery',
          date: processedTimeline[i].date,
          change_percent: change.toFixed(1),
          severity: 'low',
          message: `Recuperação de ${change.toFixed(1)}% no humor`,
        });
      }
    }

    // Ações recomendadas baseadas em tendência
    const recentData = processedTimeline.slice(-7); // Últimos 7 pontos
    const avgRecent = recentData.reduce((acc: number, d: any) => acc + d.avg_mood_index, 0) / recentData.length;
    
    let recommendedAction = '';
    if (avgRecent < 30) {
      recommendedAction = 'Crítico: Contatar cliente urgentemente para entender insatisfação';
    } else if (avgRecent < 50) {
      recommendedAction = 'Atenção: Agendar reunião para revisar expectativas';
    } else if (avgRecent < 70) {
      recommendedAction = 'Monitorar: Cliente neutro, buscar oportunidades de melhoria';
    } else {
      recommendedAction = 'Ótimo: Cliente satisfeito, manter qualidade de serviço';
    }

    return new Response(
      JSON.stringify({
        timeline: processedTimeline,
        alerts,
        summary: {
          avg_mood_index: avgRecent.toFixed(1),
          total_conversations: processedTimeline.reduce((acc: number, t: any) => 
            acc + (t.conversation_count || 0), 0
          ),
          recommended_action: recommendedAction,
        },
        period: { from, to },
        granularity,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Mood index timeline error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

