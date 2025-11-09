import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface CreateGroupRequest {
  label: string;
  description?: string;
  color?: string;
  icon?: string;
  members: Array<{
    company_cnpj: string;
    position?: number;
  }>;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

    // Parse request
    const body: CreateGroupRequest = await req.json();
    const { label, description, color, icon, members } = body;

    // Validate
    if (!label || !members || members.length === 0) {
      return corsReply(
        new Response(
          JSON.stringify({
            error: "label e members (array com pelo menos 1 item) são obrigatórios",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        )
      );
    }

    // 1. Create group
    const { data: grupo, error: groupError } = await supabase
      .from("group_aliases")
      .insert({
        label,
        description,
        color,
        icon,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (groupError) {
      console.error("Error creating group:", groupError);
      throw groupError;
    }

    // 2. Insert members
    const memberRecords = members.map((m, idx) => ({
      alias_id: grupo.id,
      company_cnpj: m.company_cnpj,
      position: m.position || idx + 1,
    }));

    const { error: membersError } = await supabase
      .from("group_alias_members")
      .insert(memberRecords);

    if (membersError) {
      console.error("Error inserting members:", membersError);
      throw membersError;
    }

    // 3. Fetch complete data with JOINs
    const { data: membersWithDetails, error: detailsError } = await supabase
      .from("group_alias_members")
      .select(
        `
        id,
        company_cnpj,
        position,
        clientes(nome_interno_cliente, integracao_f360, integracao_omie, whatsapp_ativo)
      `
      )
      .eq("alias_id", grupo.id)
      .order("position");

    if (detailsError) {
      console.error("Error fetching details:", detailsError);
      throw detailsError;
    }

    // 4. Format response
    const membersFormatted = membersWithDetails.map((m: any) => ({
      id: m.id,
      alias_id: grupo.id,
      company_cnpj: m.company_cnpj,
      company_name: m.clientes?.nome_interno_cliente || "Unknown",
      position: m.position,
      integracao_f360: m.clientes?.integracao_f360 || false,
      integracao_omie: m.clientes?.integracao_omie || false,
      whatsapp_ativo: m.clientes?.whatsapp_ativo || false,
    }));

    console.log(`[group-aliases-create] SUCCESS: Created group ${grupo.id} with ${membersFormatted.length} members`);

    return corsReply(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: grupo.id,
            label: grupo.label,
            description: grupo.description,
            color: grupo.color,
            icon: grupo.icon,
            members: membersFormatted,
            totalMembers: membersFormatted.length,
            criadoEm: grupo.created_at,
            atualizadoEm: grupo.updated_at,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 201,
        }
      )
    );
  } catch (error) {
    console.error("[group-aliases-create] ERROR:", error);

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

