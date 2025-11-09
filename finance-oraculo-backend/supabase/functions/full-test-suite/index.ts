import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestResult {
  name: string;
  status: "success" | "failed" | "skipped";
  duration_ms: number;
  error?: string;
  details?: any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const results: TestResult[] = [];

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ error: "Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    const functionsUrl = `${supabaseUrl}/functions/v1`;
    const headers = {
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    };

    // Teste 1: Seed realistic data
    const seedStart = Date.now();
    try {
      const seedResponse = await fetch(`${functionsUrl}/seed-realistic-data`, {
        method: "POST",
        headers,
        body: JSON.stringify({ mode: "minimal", clear_existing: false }),
      });

      const seedData = await seedResponse.json();

      if (seedResponse.ok && seedData.seeded) {
        results.push({
          name: "seed-realistic-data",
          status: "success",
          duration_ms: Date.now() - seedStart,
          details: seedData,
        });
      } else {
        throw new Error(seedData.error || "Falha ao executar seed");
      }
    } catch (error) {
      results.push({
        name: "seed-realistic-data",
        status: "failed",
        duration_ms: Date.now() - seedStart,
        error: error.message,
      });
    }

    // Teste 2: WhatsApp Simulator - Generate Test Users
    const simStart = Date.now();
    try {
      const simResponse = await fetch(`${functionsUrl}/whatsapp-simulator`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "generate_test_users", count: 5 }),
      });

      const simData = await simResponse.json();

      if (simResponse.ok && simData.generated > 0) {
        results.push({
          name: "whatsapp-simulator (generate_test_users)",
          status: "success",
          duration_ms: Date.now() - simStart,
          details: simData,
        });
      } else {
        throw new Error(simData.error || "Falha ao gerar usuários de teste");
      }
    } catch (error) {
      results.push({
        name: "whatsapp-simulator (generate_test_users)",
        status: "failed",
        duration_ms: Date.now() - simStart,
        error: error.message,
      });
    }

    // Teste 3: Mood Index Timeline
    const moodStart = Date.now();
    try {
      const now = new Date();
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(now.getMonth() - 1);

      const moodResponse = await fetch(
        `${functionsUrl}/mood-index-timeline?date_from=${oneMonthAgo.toISOString().split("T")[0]}&date_to=${now.toISOString().split("T")[0]}&granularity=daily`,
        {
          method: "GET",
          headers,
        }
      );

      const moodData = await moodResponse.json();

      if (moodResponse.ok && moodData.timeline) {
        results.push({
          name: "mood-index-timeline",
          status: "success",
          duration_ms: Date.now() - moodStart,
          details: {
            records: moodData.timeline.length,
            stats: moodData.stats,
          },
        });
      } else {
        throw new Error(moodData.error || "Falha ao buscar mood timeline");
      }
    } catch (error) {
      results.push({
        name: "mood-index-timeline",
        status: "failed",
        duration_ms: Date.now() - moodStart,
        error: error.message,
      });
    }

    // Teste 4: Usage Details
    const usageStart = Date.now();
    try {
      const now = new Date();
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(now.getMonth() - 1);

      const usageResponse = await fetch(
        `${functionsUrl}/usage-details?date_from=${oneMonthAgo.toISOString().split("T")[0]}&date_to=${now.toISOString().split("T")[0]}`,
        {
          method: "GET",
          headers,
        }
      );

      const usageData = await usageResponse.json();

      if (usageResponse.ok && usageData.users) {
        results.push({
          name: "usage-details",
          status: "success",
          duration_ms: Date.now() - usageStart,
          details: {
            users: usageData.users.length,
            stats: usageData.stats,
          },
        });
      } else {
        throw new Error(usageData.error || "Falha ao buscar usage details");
      }
    } catch (error) {
      results.push({
        name: "usage-details",
        status: "failed",
        duration_ms: Date.now() - usageStart,
        error: error.message,
      });
    }

    // Calcular sumário
    const totalDuration = Date.now() - startTime;
    const passed = results.filter((r) => r.status === "success").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const skipped = results.filter((r) => r.status === "skipped").length;

    const summary = {
      total_tests: results.length,
      passed,
      failed,
      skipped,
      success_rate: results.length > 0 ? ((passed / results.length) * 100).toFixed(2) : "0.00",
      total_duration_ms: totalDuration,
      timestamp: new Date().toISOString(),
    };

    const response = {
      summary,
      results,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: failed === 0 ? 200 : 207, // 207 Multi-Status se houver falhas
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
