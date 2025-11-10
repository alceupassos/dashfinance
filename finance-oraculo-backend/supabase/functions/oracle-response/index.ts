import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { routeLLM } from "../common/llm_router.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}

function createSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

async function ensureLatestCashflow(supabase: ReturnType<typeof createSupabase>, cnpj: string) {
  const { data, error } = await supabase
    .from("cashflow_entries")
    .select("*")
    .eq("company_cnpj", cnpj)
    .limit(1);

  if (error) {
    console.error("cashflow query error", error);
  }
  if (!data || data.length === 0) {
    await supabase.functions.invoke("sync-f360", {
      method: "POST",
      body: JSON.stringify({ cnpj })
    });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  if (!token) {
    return new Response(JSON.stringify({ error: "Não autorizado" }), {
      status: 401,
      headers: { ...corsHeaders(), "Content-Type": "application/json" }
    });
  }

  const supabase = createSupabase();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Sessão inválida" }), {
      status: 401,
      headers: { ...corsHeaders(), "Content-Type": "application/json" }
    });
  }

  try {
    // GET history fallback
    if (req.method === "GET") {
      const limit = Number(url.searchParams.get("limit") ?? "20");
      const companyFilter = url.searchParams.get("company_cnpj");
      const {
        data: profileData
      } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      const isAdmin = profileData?.role === "admin";

      let query = supabase
        .from("oracle_chat_history")
        .select("question, answer, model, created_at, company_cnpj")
        .eq("user_id", user.id);

      if (isAdmin && companyFilter) {
        query = query.eq("company_cnpj", companyFilter);
      }

      if (companyFilter && !isAdmin) {
        query = query.eq("company_cnpj", companyFilter);
      }

      const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
      if (error) throw error;

      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders(), "Content-Type": "application/json" }
      });
    }

    const payload = await req.json().catch(() => ({}));
    const question = (payload?.question as string) ?? "";
    
    // Aceitar tanto company_id (UUID) quanto company_cnpj
    let companyIdentifier =
      (payload?.company_cnpj as string) ??
      (payload?.company_id as string) ??
      (user.user_metadata?.default_company_cnpj as string) ??
      (user.user_metadata?.default_company_id as string) ??
      "";

    if (!companyIdentifier) {
      return new Response(JSON.stringify({ error: "Empresa não definida" }), {
        status: 400,
        headers: { ...corsHeaders(), "Content-Type": "application/json" }
      });
    }
    
    // Se for UUID (company_id), buscar o CNPJ na tabela clientes
    let companyCnpj = companyIdentifier;
    if (companyIdentifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      // É um UUID, buscar CNPJ
      const { data: cliente } = await supabase
        .from('clientes')
        .select('cnpj')
        .eq('id', companyIdentifier)
        .single();
      companyCnpj = cliente?.cnpj ?? companyIdentifier;
    }

    await ensureLatestCashflow(supabase, companyCnpj);

    const [cashflow, dre, alerts] = await Promise.all([
      supabase
        .from("cashflow_entries")
        .select("date, kind, category, amount")
        .eq("company_cnpj", companyCnpj)
        .order("date", { ascending: false })
        .limit(60),
      supabase
        .from("dre_entries")
        .select("date, nature, amount, account")
        .eq("company_cnpj", companyCnpj)
        .order("date", { ascending: false })
        .limit(40),
      supabase
        .from("financial_alerts")
        .select("id, tipo, prioridade, description, status")
        .eq("company_cnpj", companyCnpj)
        .order("created_at", { ascending: false })
        .limit(10)
        .then(res => ({ data: [], error: null })) // Tabela pode não existir
    ]);

    const totalEntries = (cashflow.data ?? []).filter((row: any) => row.kind === "in");
    const totalExits = (cashflow.data ?? []).filter((row: any) => row.kind === "out");

    const summary = [
      `Saldo consolidado atual: R$ ${(cashflow.data ?? [])
        .reduce((sum: number, row: any) => sum + (row.kind === "in" ? row.amount : -row.amount), 0)
        .toLocaleString("pt-BR")}`,
      `Entradas recentes: R$ ${totalEntries
        .reduce((sum: number, row: any) => sum + row.amount, 0)
        .toLocaleString("pt-BR")}`,
      `Saídas recentes: R$ ${totalExits
        .reduce((sum: number, row: any) => sum + row.amount, 0)
        .toLocaleString("pt-BR")}`,
      `Alertas críticos: ${(alerts.data ?? []).filter((alert: any) => alert.prioridade === "crítica").length}`
    ];

    const dreHighlights = (dre.data ?? [])
      .slice(0, 5)
      .map((row: any) => `${row.account} (${row.nature}): R$ ${row.amount.toLocaleString("pt-BR")}`)
      .join(" | ");

    const prompt = `
Você é um executivo de BPO financeiro respondendo de forma estruturada.
Cliente CNPJ: ${companyCnpj}.
Resumo dos dados disponíveis:
${summary.join("\n")}
DRE destacado: ${dreHighlights || "dados não disponíveis"}.
Alertas ativos: ${(alerts.data ?? []).map((alert: any) => `${alert.tipo} (${alert.status})`).join(", ") || "nenhum"}.
Pergunta do cliente: ${question}

Responda com:
1. Resumo executivo com máximo 3 frases.
2. Insights numéricos diretos.
3. Ações recomendadas (priorize 3 passos com verbos no imperativo).
Finalize indicando explicitamente qual integração forneceu os dados (Omie, F360 ou banco local).
`;

    const llmResponse = await routeLLM(
      {
        prompt,
        prompt_class: "analise",
        config: {
          modelo_complexo: "chatgpt-5-thinking",
          temperatura_complexa: 0.4,
          modelo_simples: "haiku-3.5",
          temperatura_simples: 0.3
        }
      },
      supabase
    );

    await supabase.from("oracle_chat_history").insert({
      user_id: user.id,
      question: question.trim(),
      answer: llmResponse.resposta,
      model: llmResponse.modelo_usado,
      company_cnpj: companyCnpj
    });

    return new Response(
      JSON.stringify({
        answer: llmResponse.resposta,
        modelo: llmResponse.modelo_usado
      }),
      { headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("oracle-response error", error);
    return new Response(
      JSON.stringify({ error: error.message || "Falha ao gerar resposta" }),
      { status: 500, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    );
  }
});
