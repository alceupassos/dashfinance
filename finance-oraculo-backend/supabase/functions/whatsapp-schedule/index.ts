import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ScheduleMessageRequest {
  empresa_cnpj: string;
  contato_phone: string;
  mensagem: string;
  dataAgendada: string;
  recorrencia?: "unica" | "diaria" | "semanal" | "mensal";
  templateId?: string;
  variaveis?: Record<string, string>;
  idempotencyKey?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

    // Parse request
    const body: ScheduleMessageRequest = await req.json();
    const {
      empresa_cnpj,
      contato_phone,
      mensagem,
      dataAgendada,
      recorrencia = "unica",
      templateId,
      variaveis,
      idempotencyKey,
    } = body;

    // Validate required fields
    if (!empresa_cnpj || !contato_phone || !mensagem || !dataAgendada) {
      return corsReply(
        new Response(
          JSON.stringify({
            error: "Missing required fields: empresa_cnpj, contato_phone, mensagem, dataAgendada",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        )
      );
    }

    // Validate date is in future
    const scheduledDate = new Date(dataAgendada);
    const now = new Date();

    if (scheduledDate <= now) {
      return corsReply(
        new Response(
          JSON.stringify({
            error: "dataAgendada must be in the future",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        )
      );
    }

    // Validate recorrencia
    const validRecurrence = ["unica", "diaria", "semanal", "mensal"];
    if (!validRecurrence.includes(recorrencia)) {
      return corsReply(
        new Response(
          JSON.stringify({
            error: `Invalid recorrencia. Must be one of: ${validRecurrence.join(", ")}`,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        )
      );
    }

    // Prepare final message
    let textoFinal = mensagem;
    if (variaveis) {
      for (const [key, value] of Object.entries(variaveis)) {
        textoFinal = textoFinal.replace(`{{${key}}}`, String(value));
      }
    }

    // Generate scheduled ID
    const scheduledId = `scheduled-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Store in whatsapp_scheduled
    const { error: storeError } = await supabase.from("whatsapp_scheduled").insert({
      empresa_cnpj,
      contato_phone,
      mensagem: textoFinal,
      dataAgendada: scheduledDate.toISOString(),
      recorrencia,
      templateId,
      variaveisPreenChidas: variaveis,
      status: "agendada",
      tentativas: 0,
      proximaTentativa: scheduledDate.toISOString(),
      scheduledId,
      idempotencyKey,
      criadoEm: new Date().toISOString(),
    });

    if (storeError) {
      console.error("Error storing scheduled message:", storeError);
      throw storeError;
    }

    console.log(
      `[whatsapp-schedule] SUCCESS: Message scheduled for ${contato_phone} at ${dataAgendada}`
    );

    return corsReply(
      new Response(
        JSON.stringify({
          success: true,
          scheduledId,
          status: "agendada",
          dataAgendada: scheduledDate.toISOString(),
          proximaTentativa: scheduledDate.toISOString(),
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 201,
        }
      )
    );
  } catch (error) {
    console.error("[whatsapp-schedule] ERROR:", error);

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

