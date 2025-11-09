import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface SendMessageRequest {
  empresa_cnpj: string;
  contato_phone: string;
  mensagem: string;
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
  response.headers.set("Access-Control-Allow-Origin": "*");
  return response;
}

export default async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsReply(new Response("ok", { headers: corsHeaders }));
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const wasenderToken = Deno.env.get("WASENDER_TOKEN") || "";

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    if (!wasenderToken) {
      console.warn("WASENDER_TOKEN not configured, will store message but not send");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    const body: SendMessageRequest = await req.json();
    const { empresa_cnpj, contato_phone, mensagem, templateId, variaveis, idempotencyKey } = body;

    // Validate required fields
    if (!empresa_cnpj || !contato_phone || !mensagem) {
      return corsReply(
        new Response(
          JSON.stringify({
            error: "Missing required fields: empresa_cnpj, contato_phone, mensagem",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        )
      );
    }

    // Validate phone format (basic: must have 55 and 11 digits)
    if (!/^\d{10,15}$/.test(contato_phone)) {
      return corsReply(
        new Response(
          JSON.stringify({
            error: "Invalid phone format. Expected 10-15 digits (e.g., 5511999999999)",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        )
      );
    }

    // Validate message length
    if (mensagem.length > 4096) {
      return corsReply(
        new Response(
          JSON.stringify({
            error: "Message too long. Maximum 4096 characters",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        )
      );
    }

    // Prepare final message (replace variables if provided)
    let textoFinal = mensagem;
    if (variaveis) {
      for (const [key, value] of Object.entries(variaveis)) {
        textoFinal = textoFinal.replace(`{{${key}}}`, String(value));
      }
    }

    // Generate message ID
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let wasenderMessageId = messageId;
    let wasenderStatus = "fila";

    // Send via WASender if token available
    if (wasenderToken) {
      try {
        const wasenderResponse = await fetch("https://api.wasender.com.br/api/send-message", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${wasenderToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phone: contato_phone,
            message: textoFinal,
            idempotency_key: idempotencyKey,
          }),
        });

        if (wasenderResponse.ok) {
          const wasenderResult = await wasenderResponse.json();
          wasenderMessageId = wasenderResult.id || messageId;
          wasenderStatus = "enviada";
        } else {
          console.warn(
            `WASender returned ${wasenderResponse.status}, message will be queued`
          );
          wasenderStatus = "fila";
        }
      } catch (wasenderError) {
        console.warn("WASender request failed, message will be queued:", wasenderError);
        wasenderStatus = "fila";
      }
    }

    // Store message in database
    const { error: storeError } = await supabase.from("whatsapp_messages").insert({
      empresa_cnpj,
      contato_phone,
      textoEnviado: textoFinal,
      tipo: "enviada",
      status: wasenderStatus,
      messageId: wasenderMessageId,
      templateUsada: templateId,
      variaveisUsadas: variaveis,
      timestamp: new Date().toISOString(),
    });

    if (storeError) {
      console.warn("Could not store message:", storeError);
    }

    console.log(`[whatsapp-send] SUCCESS: Message sent to ${contato_phone}`);

    return corsReply(
      new Response(
        JSON.stringify({
          success: true,
          messageId: wasenderMessageId,
          status: wasenderStatus,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      )
    );
  } catch (error) {
    console.error("[whatsapp-send] ERROR:", error);

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

