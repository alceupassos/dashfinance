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
    const granularity = url.searchParams.get("granularity") || "daily";
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

    // Mapear granularidade
    const periodType = granularity === "daily" ? "day" : granularity === "weekly" ? "week" : "month";

    // Buscar dados do mood index
    let query = supabaseClient
      .from("mood_index_timeline")
      .select("*")
      .gte("period_date", dateFrom)
      .lte("period_date", dateTo)
      .eq("period_type", periodType)
      .order("period_date", { ascending: true });

    if (companyCnpj) {
      query = query.eq("company_cnpj", companyCnpj);
    }

    const { data: timeline, error } = await query;

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Calcular estatísticas agregadas
    const stats = {
      total_records: timeline?.length || 0,
      avg_sentiment: 0,
      total_messages: 0,
      positive_ratio: 0,
      negative_ratio: 0,
    };

    if (timeline && timeline.length > 0) {
      const totalSentiment = timeline.reduce(
        (sum, record) => sum + parseFloat(record.avg_sentiment_score || 0),
        0
      );
      stats.avg_sentiment = totalSentiment / timeline.length;

      stats.total_messages = timeline.reduce(
        (sum, record) => sum + (record.total_messages || 0),
        0
      );

      const totalPositive = timeline.reduce(
        (sum, record) => sum + (record.positive_count || 0) + (record.very_positive_count || 0),
        0
      );

      const totalNegative = timeline.reduce(
        (sum, record) => sum + (record.negative_count || 0) + (record.very_negative_count || 0),
        0
      );

      if (stats.total_messages > 0) {
        stats.positive_ratio = (totalPositive / stats.total_messages) * 100;
        stats.negative_ratio = (totalNegative / stats.total_messages) * 100;
      }
    }

    const response = {
      date_from: dateFrom,
      date_to: dateTo,
      granularity,
      period_type: periodType,
      company_cnpj: companyCnpj || "all",
      stats,
      timeline: timeline || [],
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
