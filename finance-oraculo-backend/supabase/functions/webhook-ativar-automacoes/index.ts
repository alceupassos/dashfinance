// =====================================================
// WEBHOOK: ATIVAR AUTOMAÇÕES QUANDO JESSICA MANDA MSG
// =====================================================
// Ativa automações quando cliente manda primeira mensagem

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, message } = await req.json();

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: "phone e message são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`Mensagem recebida de ${phone}: ${message.substring(0, 50)}`);

    // Buscar cliente por telefone
    const { data: cliente, error: clienteError } = await supabase
      .from("onboarding_tokens")
      .select("token, grupo_empresarial")
      .eq("activated_by_phone", phone)
      .eq("status", "activated")
      .single();

    if (clienteError || !cliente) {
      console.log("Cliente não encontrado");
      return new Response(
        JSON.stringify({ success: false, error: "Cliente não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Cliente encontrado: ${cliente.token} (${cliente.grupo_empresarial})`);

    // Verificar se automações já estão ativas
    const { data: config, error: configError } = await supabase
      .from("config_automacoes")
      .select("ativo")
      .eq("token", cliente.token)
      .single();

    if (config && !config.ativo) {
      // ATIVAR automações
      console.log("Ativando automações...");
      
      const { error: updateError } = await supabase
        .from("config_automacoes")
        .update({ ativo: true })
        .eq("token", cliente.token);

      if (updateError) {
        console.error("Erro ao ativar:", updateError);
        return new Response(
          JSON.stringify({ success: false, error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Automações ativadas!");

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Automações ativadas",
          cliente: cliente.token,
          grupo: cliente.grupo_empresarial
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Automações já estavam ativas",
        cliente: cliente.token
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

