import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type"
  };
}

function createSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("user_id");

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders(), "Content-Type": "application/json" }
    });
  }

  const supabase = createSupabaseClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), {
      status: 401,
      headers: { ...corsHeaders(), "Content-Type": "application/json" }
    });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const effectiveUserId = isAdmin && targetUserId ? targetUserId : user.id;

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("oracle_user_settings")
      .select("web_model, whatsapp_model")
      .eq("user_id", effectiveUserId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("oracle-settings GET error", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders(), "Content-Type": "application/json" }
      });
    }

    const defaults = {
      web_model: "chatgpt-5-thinking",
      whatsapp_model: "gpt-4o-mini"
    };

    return new Response(
      JSON.stringify(data ?? defaults),
      { headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    );
  }

  if (req.method === "PUT") {
    try {
      const payload = await req.json();
      const { data, error } = await supabase
        .from("oracle_user_settings")
        .upsert(
          {
            user_id: effectiveUserId,
            web_model: payload.web_model ?? "chatgpt-5-thinking",
            whatsapp_model: payload.whatsapp_model ?? "gpt-4o-mini",
            updated_at: new Date().toISOString()
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (error) {
        console.error("oracle-settings PUT error", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders(), "Content-Type": "application/json" }
        });
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders(), "Content-Type": "application/json" } }
      );
    } catch (err) {
      console.error("oracle-settings PUT parse error", err);
      return new Response(
        JSON.stringify({ error: "Invalid payload" }),
        { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: "Method not allowed" }),
    { status: 405, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
  );
});
