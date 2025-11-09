import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function corsReply(response: Response) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  return response;
}

export default async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsReply(new Response("ok", { headers: corsHeaders }));
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse ID from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const scheduledId = pathParts[pathParts.length - 1];

    if (!scheduledId) {
      return corsReply(
        new Response(
          JSON.stringify({ error: "scheduledId is required" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        )
      );
    }

    // Update status to 'cancelada'
    const { error } = await supabase
      .from("whatsapp_scheduled")
      .update({ status: "cancelada" })
      .eq("id", scheduledId);

    if (error) {
      console.error("Error canceling scheduled message:", error);
      throw error;
    }

    console.log(`[whatsapp-scheduled-cancel] SUCCESS: Canceled ${scheduledId}`);

    return corsReply(
      new Response(
        JSON.stringify({
          success: true,
          message: "Agendamento cancelado",
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      )
    );
  } catch (error) {
    console.error("[whatsapp-scheduled-cancel] ERROR:", error);

    return corsReply(
      new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      )
    );
  }
};

