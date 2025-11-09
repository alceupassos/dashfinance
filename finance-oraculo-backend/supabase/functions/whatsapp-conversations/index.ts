import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface WhatsappConversation {
  id: string;
  empresa_cnpj: string;
  contato_phone: string;
  contato_nome: string;
  contato_tipo: string;
  ultimaMensagem?: string;
  ultimaMensagemEm: string;
  ativo: boolean;
  status: string;
  totalMensagens: number;
  naoLidas: number;
  criadoEm: string;
  ultimaAtualizacao: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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

    // Parse query params
    const url = new URL(req.url);
    const empresaCnpj = url.searchParams.get("empresa_cnpj");
    const status = url.searchParams.get("status") || "ativo";
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Validar status
    const validStatuses = ["ativo", "pausado", "encerrado"];
    if (!validStatuses.includes(status)) {
      return corsReply(
        new Response(
          JSON.stringify({
            error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        )
      );
    }

    // Build query
    let query = supabase
      .from("whatsapp_conversations")
      .select("*", { count: "exact" })
      .eq("status", status)
      .order("ultimaMensagemEm", { ascending: false })
      .range(offset, offset + limit - 1);

    if (empresaCnpj) {
      query = query.eq("empresa_cnpj", empresaCnpj);
    }

    const { data: conversations, error, count } = await query;

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    console.log(`[whatsapp-conversations] SUCCESS: Found ${conversations?.length || 0} conversations`);

    return corsReply(
      new Response(
        JSON.stringify({
          success: true,
          data: conversations || [],
          total: count || 0,
          limit,
          offset,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      )
    );
  } catch (error) {
    console.error("[whatsapp-conversations] ERROR:", error);

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

