import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface UpdateAlertRequest {
  status: "pendente" | "resolvido" | "ignorado";
  resolucao_tipo?: "corrigido" | "falso_positivo" | "ignorar";
  resolucao_observacoes?: string;
  resolvido_por?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Prefer",
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
    const alertId = pathParts[pathParts.length - 1];

    if (!alertId) {
      return corsReply(
        new Response(
          JSON.stringify({ error: "alertId is required" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        )
      );
    }

    // Parse request
    const body: UpdateAlertRequest = await req.json();
    const {
      status,
      resolucao_tipo,
      resolucao_observacoes,
      resolvido_por,
    } = body;

    // Validate status
    if (!status) {
      return corsReply(
        new Response(
          JSON.stringify({ error: "status é obrigatório" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        )
      );
    }

    const validStatuses = ["pendente", "resolvido", "ignorado"];
    if (!validStatuses.includes(status)) {
      return corsReply(
        new Response(
          JSON.stringify({
            error: `status inválido. Deve ser um de: ${validStatuses.join(", ")}`,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        )
      );
    }

    // Get current alert to validate transition
    const { data: currentAlert, error: fetchError } = await supabase
      .from("financial_alerts")
      .select("status")
      .eq("id", alertId)
      .single();

    if (fetchError || !currentAlert) {
      return corsReply(
        new Response(
          JSON.stringify({ error: "Alert not found" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 404,
          }
        )
      );
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      pendente: ["resolvido", "ignorado"],
      resolvido: ["pendente", "ignorado"],
      ignorado: ["pendente", "resolvido"],
    };

    if (!validTransitions[currentAlert.status]?.includes(status)) {
      return corsReply(
        new Response(
          JSON.stringify({
            error: `Transição inválida: ${currentAlert.status} → ${status}`,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        )
      );
    }

    // Prepare update data
    const updateData: any = {
      status,
      resolucao_tipo,
      resolucao_observacoes,
      resolvido_por,
    };

    // Set resolved_at if moving away from pendente
    if (status !== "pendente") {
      updateData.resolved_at = new Date().toISOString();
    } else {
      updateData.resolved_at = null;
    }

    // Update alert
    const { data: updated, error: updateError } = await supabase
      .from("financial_alerts")
      .update(updateData)
      .eq("id", alertId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating alert:", updateError);
      throw updateError;
    }

    console.log(`[financial-alerts-update] SUCCESS: Updated alert ${alertId} to status ${status}`);

    return corsReply(
      new Response(
        JSON.stringify({
          success: true,
          data: updated,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      )
    );
  } catch (error) {
    console.error("[financial-alerts-update] ERROR:", error);

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

