import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface HealthCheckResult {
  name: string;
  tier: number;
  method: string;
  endpoint: string;
  http_status: number;
  response_time_ms: number;
  is_success: boolean;
  error_message: string;
  timestamp: string;
}

interface HealthCheckPayload {
  results: HealthCheckResult[];
  timestamp: string;
  success_rate: number;
  tier_filter?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authorization (check for valid JWT)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin (you might want to add role verification here)
    if (req.method === "POST") {
      const payload: HealthCheckPayload = await req.json();

      // Batch insert health check results
      const { error: insertError } = await supabase
        .from("health_checks")
        .insert(
          payload.results.map((result) => ({
            function_name: result.name,
            tier: result.tier,
            method: result.method,
            endpoint: result.endpoint,
            http_status: result.http_status,
            response_time_ms: result.response_time_ms,
            is_success: result.is_success,
            error_message: result.error_message || null,
            timestamp: result.timestamp,
          }))
        );

      if (insertError) {
        console.error("Error inserting health checks:", insertError);
        return new Response(
          JSON.stringify({
            error: "Failed to store health check results",
            details: insertError.message,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Stored ${payload.results.length} health check results`,
          summary: {
            total: payload.results.length,
            passed: payload.results.filter((r) => r.is_success).length,
            failed: payload.results.filter((r) => !r.is_success).length,
            success_rate: payload.success_rate,
            tier_filter: payload.tier_filter || "all",
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (req.method === "GET") {
      // Retrieve recent health check summary
      const { data, error: fetchError } = await supabase
        .from("health_checks_summary")
        .select("*")
        .order("tier")
        .order("function_name");

      if (fetchError) {
        console.error("Error fetching health checks:", fetchError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch health check summary" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in admin-health-check-results:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

