import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SimulatorRequest {
  action: "generate_test_users" | "simulate_conversation" | "send_batch";
  count?: number;
  company_cnpj?: string;
  phone?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { action, count = 10, company_cnpj, phone }: SimulatorRequest = await req.json();

    const results = {
      action,
      generated: 0,
      items: [] as any[],
      errors: [] as string[],
    };

    switch (action) {
      case "generate_test_users": {
        // Buscar ou usar empresa padrão
        let targetCnpj = company_cnpj;

        if (!targetCnpj) {
          const { data: companies } = await supabaseClient
            .from("companies")
            .select("cnpj")
            .eq("status", "active")
            .limit(1);

          if (companies && companies.length > 0) {
            targetCnpj = companies[0].cnpj;
          } else {
            // Criar empresa de teste se não existir
            const { data: newCompany } = await supabaseClient
              .from("companies")
              .insert({
                cnpj: "99999999000199",
                name: "Empresa Teste WhatsApp",
                status: "active",
              })
              .select()
              .single();

            targetCnpj = newCompany?.cnpj || "99999999000199";
          }
        }

        // Gerar usuários de teste
        const testUsers = [];
        const now = new Date();

        for (let i = 0; i < count; i++) {
          const userId = String(10000 + i).padStart(5, "0");
          const testPhone = `5511${String(950000000 + i).padStart(9, "0")}`;

          testUsers.push({
            company_cnpj: targetCnpj,
            phone: testPhone,
            name: `Usuário Teste ${userId}`,
            is_active: true,
            last_message_at: now.toISOString(),
            created_at: now.toISOString(),
          });
        }

        const { data: usersData, error: usersError } = await supabaseClient
          .from("whatsapp_users")
          .upsert(testUsers, { onConflict: "phone" })
          .select();

        if (usersError) {
          results.errors.push(`Erro ao criar usuários: ${usersError.message}`);
        } else {
          results.generated = usersData?.length || 0;
          results.items = usersData || [];
        }
        break;
      }

      case "simulate_conversation": {
        if (!phone || !company_cnpj) {
          return new Response(
            JSON.stringify({ error: "phone e company_cnpj são obrigatórios para simulate_conversation" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        // Simular conversa com mensagens de entrada e saída
        const conversationMessages = [
          { direction: "inbound", text: "Olá, preciso de ajuda com meu extrato", sentiment: 0.2 },
          { direction: "outbound", text: "Olá! Claro, posso te ajudar. Qual é a sua dúvida?", sentiment: 0.8 },
          { direction: "inbound", text: "Não estou conseguindo ver os lançamentos de hoje", sentiment: -0.3 },
          { direction: "outbound", text: "Vou verificar isso para você. Aguarde um momento.", sentiment: 0.6 },
          { direction: "inbound", text: "Obrigado!", sentiment: 0.9 },
        ];

        const messages = [];
        const now = new Date();

        for (let i = 0; i < conversationMessages.length; i++) {
          const messageDate = new Date(now.getTime() + i * 60000); // 1 minuto de diferença
          const msg = conversationMessages[i];

          messages.push({
            company_cnpj,
            phone,
            message_text: msg.text,
            direction: msg.direction,
            sentiment_score: msg.sentiment.toFixed(2),
            sentiment_label: msg.sentiment > 0.5
              ? "positive"
              : msg.sentiment < -0.5
              ? "negative"
              : "neutral",
            received_at: messageDate.toISOString(),
            created_at: messageDate.toISOString(),
          });
        }

        const { data: messagesData, error: messagesError } = await supabaseClient
          .from("whatsapp_messages")
          .insert(messages)
          .select();

        if (messagesError) {
          results.errors.push(`Erro ao criar conversa: ${messagesError.message}`);
        } else {
          results.generated = messagesData?.length || 0;
          results.items = messagesData || [];
        }
        break;
      }

      case "send_batch": {
        // Enviar lote de mensagens aleatórias
        const { data: users } = await supabaseClient
          .from("whatsapp_users")
          .select("phone, company_cnpj")
          .eq("is_active", true)
          .limit(count);

        if (!users || users.length === 0) {
          results.errors.push("Nenhum usuário ativo encontrado");
          break;
        }

        const batchMessages = [];
        const now = new Date();

        const templates = [
          { text: "Tudo certo com meu pagamento?", sentiment: 0.1 },
          { text: "Excelente atendimento!", sentiment: 0.9 },
          { text: "Preciso de ajuda urgente", sentiment: -0.4 },
          { text: "Quando sai meu relatório?", sentiment: 0.0 },
          { text: "Muito obrigado pela ajuda", sentiment: 0.8 },
        ];

        for (const user of users) {
          const template = templates[Math.floor(Math.random() * templates.length)];

          batchMessages.push({
            company_cnpj: user.company_cnpj,
            phone: user.phone,
            message_text: template.text,
            direction: "inbound",
            sentiment_score: template.sentiment.toFixed(2),
            sentiment_label: template.sentiment > 0.5
              ? "positive"
              : template.sentiment < -0.5
              ? "negative"
              : "neutral",
            received_at: now.toISOString(),
            created_at: now.toISOString(),
          });
        }

        const { data: batchData, error: batchError } = await supabaseClient
          .from("whatsapp_messages")
          .insert(batchMessages)
          .select();

        if (batchError) {
          results.errors.push(`Erro ao enviar lote: ${batchError.message}`);
        } else {
          results.generated = batchData?.length || 0;
          results.items = batchData || [];
        }
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Ação desconhecida: ${action}` }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
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
