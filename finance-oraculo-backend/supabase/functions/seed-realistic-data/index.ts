import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SeedRequest {
  mode?: "minimal" | "full";
  clear_existing?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { mode = "minimal", clear_existing = false }: SeedRequest = await req.json();

    const results = {
      mode,
      clear_existing,
      seeded: {
        companies: 0,
        users: 0,
        whatsapp_messages: 0,
        mood_index: 0,
        usage_records: 0,
      },
      errors: [] as string[],
    };

    // Limpar dados existentes se solicitado
    if (clear_existing) {
      const tables = [
        "whatsapp_messages",
        "mood_index_timeline",
        "user_system_usage",
        "llm_token_usage",
      ];

      for (const table of tables) {
        const { error } = await supabaseClient.from(table).delete().neq("id", "");
        if (error) {
          results.errors.push(`Erro ao limpar ${table}: ${error.message}`);
        }
      }
    }

    // Criar empresas de teste
    const companies = [
      {
        cnpj: "11111111000101",
        name: "Empresa Demo A",
        status: "active",
      },
      {
        cnpj: "22222222000102",
        name: "Empresa Demo B",
        status: "active",
      },
      {
        cnpj: "33333333000103",
        name: "Empresa Demo C",
        status: "active",
      },
    ];

    const { data: companiesData, error: companiesError } = await supabaseClient
      .from("companies")
      .upsert(companies, { onConflict: "cnpj" })
      .select();

    if (companiesError) {
      results.errors.push(`Erro ao criar empresas: ${companiesError.message}`);
    } else {
      results.seeded.companies = companiesData?.length || 0;
    }

    // Criar mensagens WhatsApp de exemplo
    const now = new Date();
    const messages = [];

    for (let i = 0; i < (mode === "full" ? 100 : 20); i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const messageDate = new Date(now);
      messageDate.setDate(now.getDate() - daysAgo);

      const sentiments = ["very_positive", "positive", "neutral", "negative", "very_negative"];
      const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];

      messages.push({
        company_cnpj: companies[i % companies.length].cnpj,
        phone: `5511${String(90000000 + i).padStart(8, "0")}`,
        message_text: `Mensagem de teste ${i + 1}`,
        direction: i % 2 === 0 ? "inbound" : "outbound",
        sentiment_score: (Math.random() * 2 - 1).toFixed(2),
        sentiment_label: sentiment,
        received_at: messageDate.toISOString(),
        created_at: messageDate.toISOString(),
      });
    }

    const { data: messagesData, error: messagesError } = await supabaseClient
      .from("whatsapp_messages")
      .insert(messages)
      .select();

    if (messagesError) {
      results.errors.push(`Erro ao criar mensagens: ${messagesError.message}`);
    } else {
      results.seeded.whatsapp_messages = messagesData?.length || 0;
    }

    // Criar mood index timeline
    const moodRecords = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);

      for (const company of companies) {
        moodRecords.push({
          company_cnpj: company.cnpj,
          period_date: date.toISOString().split("T")[0],
          period_type: "day",
          avg_sentiment_score: (Math.random() * 1.5 - 0.5).toFixed(2),
          sentiment_trend: ["improving", "stable", "declining"][Math.floor(Math.random() * 3)],
          very_negative_count: Math.floor(Math.random() * 5),
          negative_count: Math.floor(Math.random() * 10),
          neutral_count: Math.floor(Math.random() * 20),
          positive_count: Math.floor(Math.random() * 15),
          very_positive_count: Math.floor(Math.random() * 10),
          total_messages: Math.floor(Math.random() * 50) + 10,
        });
      }
    }

    const { data: moodData, error: moodError } = await supabaseClient
      .from("mood_index_timeline")
      .upsert(moodRecords, { onConflict: "company_cnpj,period_date,period_type" })
      .select();

    if (moodError) {
      results.errors.push(`Erro ao criar mood index: ${moodError.message}`);
    } else {
      results.seeded.mood_index = moodData?.length || 0;
    }

    // Criar registros de uso do sistema
    const { data: { users }, error: usersError } = await supabaseClient.auth.admin.listUsers();

    if (usersError) {
      results.errors.push(`Erro ao listar usuários: ${usersError.message}`);
    } else if (users && users.length > 0) {
      const usageRecords = [];

      for (let i = 0; i < (mode === "full" ? 50 : 10); i++) {
        const user = users[i % users.length];
        const daysAgo = Math.floor(Math.random() * 7);
        const sessionDate = new Date(now);
        sessionDate.setDate(now.getDate() - daysAgo);

        usageRecords.push({
          user_id: user.id,
          company_cnpj: companies[i % companies.length].cnpj,
          session_start: sessionDate.toISOString(),
          session_end: new Date(sessionDate.getTime() + Math.random() * 3600000).toISOString(),
          session_duration_seconds: Math.floor(Math.random() * 3600),
          pages_visited: ["/dashboard", "/relatorios", "/empresas"],
          features_used: ["dashboard", "relatorios"],
          api_calls_count: Math.floor(Math.random() * 100),
          api_calls_successful: Math.floor(Math.random() * 90),
          api_calls_failed: Math.floor(Math.random() * 10),
          avg_api_duration_ms: Math.floor(Math.random() * 500),
          llm_interactions_count: Math.floor(Math.random() * 20),
          whatsapp_messages_sent: Math.floor(Math.random() * 30),
          whatsapp_messages_received: Math.floor(Math.random() * 40),
        });
      }

      const { data: usageData, error: usageError } = await supabaseClient
        .from("user_system_usage")
        .insert(usageRecords)
        .select();

      if (usageError) {
        results.errors.push(`Erro ao criar registros de uso: ${usageError.message}`);
      } else {
        results.seeded.usage_records = usageData?.length || 0;
      }
    }

    return new Response(JSON.stringify(results), {
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
