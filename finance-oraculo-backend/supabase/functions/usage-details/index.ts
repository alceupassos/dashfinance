import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const url = new URL(req.url);
    const dateFrom = url.searchParams.get("date_from");
    const dateTo = url.searchParams.get("date_to");
    const userId = url.searchParams.get("user_id");
    const companyCnpj = url.searchParams.get("company_cnpj");

    if (!dateFrom || !dateTo) {
      return new Response(
        JSON.stringify({ error: "Parâmetros date_from e date_to são obrigatórios" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Buscar dados de uso do sistema
    let query = supabaseClient
      .from("user_system_usage")
      .select("*")
      .gte("session_start", dateFrom)
      .lte("session_start", dateTo)
      .order("session_start", { ascending: false });

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (companyCnpj) {
      query = query.eq("company_cnpj", companyCnpj);
    }

    const { data: usageRecords, error } = await query;

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Agregar dados por usuário
    const userAggregation: Record<string, any> = {};

    (usageRecords || []).forEach((record) => {
      const uid = record.user_id;

      if (!userAggregation[uid]) {
        userAggregation[uid] = {
          user_id: uid,
          company_cnpj: record.company_cnpj,
          total_sessions: 0,
          total_duration_seconds: 0,
          total_api_calls: 0,
          successful_api_calls: 0,
          failed_api_calls: 0,
          total_llm_interactions: 0,
          total_whatsapp_sent: 0,
          total_whatsapp_received: 0,
          pages_visited: new Set(),
          features_used: new Set(),
          last_session: record.session_start,
        };
      }

      const agg = userAggregation[uid];
      agg.total_sessions++;
      agg.total_duration_seconds += record.session_duration_seconds || 0;
      agg.total_api_calls += record.api_calls_count || 0;
      agg.successful_api_calls += record.api_calls_successful || 0;
      agg.failed_api_calls += record.api_calls_failed || 0;
      agg.total_llm_interactions += record.llm_interactions_count || 0;
      agg.total_whatsapp_sent += record.whatsapp_messages_sent || 0;
      agg.total_whatsapp_received += record.whatsapp_messages_received || 0;

      if (record.pages_visited) {
        record.pages_visited.forEach((page: string) => agg.pages_visited.add(page));
      }

      if (record.features_used) {
        record.features_used.forEach((feature: string) => agg.features_used.add(feature));
      }

      if (new Date(record.session_start) > new Date(agg.last_session)) {
        agg.last_session = record.session_start;
      }
    });

    // Converter Sets para arrays e calcular métricas adicionais
    const users = Object.values(userAggregation).map((agg) => ({
      ...agg,
      pages_visited: Array.from(agg.pages_visited),
      features_used: Array.from(agg.features_used),
      avg_session_duration: agg.total_sessions > 0
        ? Math.round(agg.total_duration_seconds / agg.total_sessions)
        : 0,
      api_success_rate: agg.total_api_calls > 0
        ? ((agg.successful_api_calls / agg.total_api_calls) * 100).toFixed(2)
        : "0.00",
    }));

    // Calcular estatísticas globais
    const stats = {
      total_users: users.length,
      total_sessions: users.reduce((sum, u) => sum + u.total_sessions, 0),
      total_duration_hours: (
        users.reduce((sum, u) => sum + u.total_duration_seconds, 0) / 3600
      ).toFixed(2),
      total_api_calls: users.reduce((sum, u) => sum + u.total_api_calls, 0),
      total_llm_interactions: users.reduce((sum, u) => sum + u.total_llm_interactions, 0),
      avg_sessions_per_user: users.length > 0
        ? (users.reduce((sum, u) => sum + u.total_sessions, 0) / users.length).toFixed(2)
        : "0.00",
    };

    const response = {
      date_from: dateFrom,
      date_to: dateTo,
      user_id: userId || "all",
      company_cnpj: companyCnpj || "all",
      stats,
      users,
      raw_records: usageRecords?.length || 0,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
