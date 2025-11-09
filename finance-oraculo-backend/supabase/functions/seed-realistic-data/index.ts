import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SeedRequest {
  mode?: "minimal" | "full";
  clear_existing?: boolean;
}

function ignoreMissingTable(error: { code?: string } | null | undefined) {
  if (!error) return false;
  return error.code === "42P01"; // undefined_table
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

    const { mode = "minimal", clear_existing = false }: SeedRequest = await req.json();

    const results = {
      mode,
      clear_existing,
      seeded: {
        companies: 0,
        groups: 0,
        onboarding_tokens: 0,
        dre_entries: 0,
        cashflow_entries: 0,
        accounts_payable: 0,
        accounts_receivable: 0,
        daily_snapshots: 0,
        financial_kpis: 0,
        whatsapp_conversations: 0,
        whatsapp_messages: 0,
        whatsapp_templates: 0,
        mood_index: 0,
        usage_records: 0,
      },
      errors: [] as string[],
    };

    // Limpar dados existentes se solicitado
    if (clear_existing) {
      const tables = [
        "whatsapp_messages",
        "whatsapp_conversations",
        "whatsapp_templates",
        "mood_index_timeline",
        "user_system_usage",
        "llm_token_usage",
        "onboarding_tokens",
        "contas_pagar",
        "contas_receber",
        "cashflow_entries",
        "daily_snapshots",
        "dre_entries",
        "financial_kpi_monthly",
      ];

      for (const table of tables) {
        const { error } = await supabaseClient.from(table).delete().neq("id", "");
        if (error && !ignoreMissingTable(error)) {
          results.errors.push(`Erro ao limpar ${table}: ${error.message}`);
        }
      }
    }

    // Criar empresas de teste
    const companies = [
      {
        cnpj: "11111111000101",
        name: "Empresa Demo A",
        status: "active",
      },
      {
        cnpj: "22222222000102",
        name: "Empresa Demo B",
        status: "active",
      },
      {
        cnpj: "33333333000103",
        name: "Empresa Demo C",
        status: "active",
      },
    ];

    const { data: companiesData, error: companiesError } = await supabaseClient
      .from("companies")
      .upsert(companies.map((company) => ({
        cnpj: company.cnpj,
        name: company.name,
        status: company.status,
      })), { onConflict: "cnpj" })
      .select();

    if (companiesError && !ignoreMissingTable(companiesError)) {
      results.errors.push(`Erro ao criar empresas: ${companiesError.message}`);
    } else {
      results.seeded.companies = companiesData?.length || 0;
    }

    // Sincronizar com tabela grupos (utilizada pelos relatórios)
    const { data: gruposData, error: gruposError } = await supabaseClient
      .from("grupos")
      .upsert(
        companies.map((company, index) => ({
          cnpj: company.cnpj,
          nome: company.name,
          razao_social: `${company.name} LTDA`,
          logo_url: `https://placehold.co/200x100?text=Demo+${index + 1}`,
          status: "ativo",
        })),
        { onConflict: "cnpj" }
      )
      .select();

    const grupos = gruposData ?? [];

    if (gruposError && !ignoreMissingTable(gruposError)) {
      results.errors.push(`Erro ao criar grupos: ${gruposError.message}`);
    } else {
      results.seeded.groups = grupos.length;
    }

    // Gerar tokens de onboarding para WhatsApp
    if (grupos.length > 0) {
      const tokensPayload = grupos.slice(0, 3).map((grupo, idx) => ({
        token: `IF${1000 + idx}`,
        empresa_id: grupo.id,
        funcao: "onboarding",
        ativo: true,
        metadata: { origem: "seed" },
      }));

      const { data: tokensData, error: tokensError } = await supabaseClient
        .from("onboarding_tokens")
        .insert(tokensPayload)
        .select();

      if (tokensError && !ignoreMissingTable(tokensError)) {
        results.errors.push(`Erro ao criar tokens: ${tokensError.message}`);
      } else {
        results.seeded.onboarding_tokens = tokensData?.length || 0;
      }
    }

    const now = new Date();

    // Criar DRE entries dos últimos 6 meses
    const dreEntries: any[] = [];
    for (const company of companies) {
      for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
        const baseDate = new Date(now);
        baseDate.setMonth(baseDate.getMonth() - monthOffset);
        const month = baseDate.toISOString().slice(0, 7);

        const receitaBase = 150000 + Math.random() * 50000;
        const custoBase = receitaBase * (0.45 + Math.random() * 0.1);
        const despesaBase = receitaBase * (0.25 + Math.random() * 0.05);
        const outrasBase = receitaBase * 0.05;

        dreEntries.push(
          {
            company_cnpj: company.cnpj,
            date: `${month}-05`,
            account: "Receita de Serviços",
            nature: "receita",
            amount: receitaBase,
          },
          {
            company_cnpj: company.cnpj,
            date: `${month}-10`,
            account: "Custo Operacional",
            nature: "custo",
            amount: -custoBase,
          },
          {
            company_cnpj: company.cnpj,
            date: `${month}-15`,
            account: "Despesas Administrativas",
            nature: "despesa",
            amount: -despesaBase,
          },
          {
            company_cnpj: company.cnpj,
            date: `${month}-18`,
            account: "Receitas Financeiras",
            nature: "outras",
            amount: outrasBase,
          },
        );
      }
    }

    if (dreEntries.length > 0) {
      const { error: dreError, data: dreData } = await supabaseClient
        .from("dre_entries")
        .insert(dreEntries)
        .select();

      if (dreError && !ignoreMissingTable(dreError)) {
        results.errors.push(`Erro ao criar DRE entries: ${dreError.message}`);
      } else {
        results.seeded.dre_entries = dreData?.length || 0;
      }
    }

    // Criar cashflow entries e contas a pagar/receber
    const cashflowEntries: any[] = [];
    const contasPagar: any[] = [];
    const contasReceber: any[] = [];

    for (const company of companies) {
      for (let dayOffset = 0; dayOffset < (mode === "full" ? 60 : 30); dayOffset++) {
        const entryDate = new Date(now);
        entryDate.setDate(now.getDate() - dayOffset);
        const dateStr = entryDate.toISOString().slice(0, 10);

        const entradaValor = Math.random() * 8000 + 2000;
        const saidaValor = Math.random() * 5000 + 1500;

        cashflowEntries.push(
          {
            company_cnpj: company.cnpj,
            date: dateStr,
            amount: entradaValor,
            kind: "in",
            category: "Receita",
            description: "Recebimento Clientes",
          },
          {
            company_cnpj: company.cnpj,
            date: dateStr,
            amount: saidaValor,
            kind: "out",
            category: "Pagamento Fornecedores",
            description: "Pagamento Fornecedor",
          },
        );
      }

      for (let i = 0; i < 10; i++) {
        const dueDate = new Date(now);
        dueDate.setDate(now.getDate() + i - 3);
        const dueStr = dueDate.toISOString().slice(0, 10);

        contasPagar.push({
          empresa_id: grupos.find((g) => g.cnpj === company.cnpj)?.id ?? null,
          company_cnpj: company.cnpj,
          fornecedor: `Fornecedor ${i + 1}`,
          descricao: `Conta a pagar ${i + 1}`,
          categoria: i % 2 === 0 ? "Marketing" : "Operacional",
          status: i % 3 === 0 ? "pago" : "pendente",
          data_emissao: dueStr,
          data_vencimento: dueStr,
          valor: Math.random() * 6000 + 500,
          pago_em: i % 3 === 0 ? dueStr : null,
        });

        contasReceber.push({
          empresa_id: grupos.find((g) => g.cnpj === company.cnpj)?.id ?? null,
          company_cnpj: company.cnpj,
          cliente: `Cliente ${i + 1}`,
          descricao: `Conta a receber ${i + 1}`,
          categoria: i % 2 === 0 ? "Mensalidade" : "Projeto",
          status: i % 3 === 0 ? "recebido" : "pendente",
          data_emissao: dueStr,
          data_vencimento: dueStr,
          valor: Math.random() * 8000 + 800,
          recebido_em: i % 3 === 0 ? dueStr : null,
        });
      }
    }

    if (cashflowEntries.length > 0) {
      const { error: cfError, data: cfData } = await supabaseClient
        .from("cashflow_entries")
        .insert(cashflowEntries)
        .select();

      if (cfError && !ignoreMissingTable(cfError)) {
        results.errors.push(`Erro ao criar cashflow entries: ${cfError.message}`);
      } else {
        results.seeded.cashflow_entries = cfData?.length || 0;
      }
    }

    if (contasPagar.length > 0) {
      const { error: cpError, data: cpData } = await supabaseClient
        .from("contas_pagar")
        .insert(contasPagar)
        .select();

      if (cpError && !ignoreMissingTable(cpError)) {
        results.errors.push(`Erro ao criar contas a pagar: ${cpError.message}`);
      } else {
        results.seeded.accounts_payable = cpData?.length || 0;
      }
    }

    if (contasReceber.length > 0) {
      const { error: crError, data: crData } = await supabaseClient
        .from("contas_receber")
        .insert(contasReceber)
        .select();

      if (crError && !ignoreMissingTable(crError)) {
        results.errors.push(`Erro ao criar contas a receber: ${crError.message}`);
      } else {
        results.seeded.accounts_receivable = crData?.length || 0;
      }
    }

    // Criar snapshots diários (últimos 30 dias)
    const snapshots: any[] = [];
    for (const company of companies) {
      for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
        const snapshotDate = new Date(now);
        snapshotDate.setDate(now.getDate() - dayOffset);

        const saldo = 120000 + Math.random() * 40000 - dayOffset * 500;
        snapshots.push({
          company_cnpj: company.cnpj,
          snapshot_date: snapshotDate.toISOString().slice(0, 10),
          cash_balance: saldo,
          available_for_payments: saldo * 0.75,
          runway_days: Math.max(30 - dayOffset, 5),
        });
      }
    }

    if (snapshots.length > 0) {
      const { error: snapError, data: snapData } = await supabaseClient
        .from("daily_snapshots")
        .upsert(snapshots, { onConflict: "company_cnpj,snapshot_date" })
        .select();

      if (snapError && !ignoreMissingTable(snapError)) {
        results.errors.push(`Erro ao criar snapshots: ${snapError.message}`);
      } else {
        results.seeded.daily_snapshots = snapData?.length || 0;
      }
    }

    // Criar KPIs mensais
    const kpiEntries: any[] = [];
    for (const company of companies) {
      for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
        const baseDate = new Date(now);
        baseDate.setMonth(baseDate.getMonth() - monthOffset);
        baseDate.setDate(1);

        const receita = 180000 + Math.random() * 60000;
        const custos = receita * (0.5 + Math.random() * 0.1);
        const ebitda = receita * (0.22 + Math.random() * 0.05);

        kpiEntries.push({
          company_cnpj: company.cnpj,
          month: baseDate.toISOString().slice(0, 10),
          receita,
          custos,
          ebitda,
          margem_bruta: (receita - custos) / receita,
        });
      }
    }

    if (kpiEntries.length > 0) {
      const { error: kpiError, data: kpiData } = await supabaseClient
        .from("financial_kpi_monthly")
        .upsert(kpiEntries, { onConflict: "company_cnpj,month" })
        .select();

      if (kpiError && !ignoreMissingTable(kpiError)) {
        results.errors.push(`Erro ao criar KPIs: ${kpiError.message}`);
      } else {
        results.seeded.financial_kpis = kpiData?.length || 0;
      }
    }

    // Criar mensagens WhatsApp de exemplo
    const messages = [] as any[];

    for (let i = 0; i < (mode === "full" ? 120 : 40); i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const messageDate = new Date(now);
      messageDate.setDate(now.getDate() - daysAgo);

      const sentiments = ["very_positive", "positive", "neutral", "negative", "very_negative"];
      const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
      const company = companies[i % companies.length];

      messages.push({
        company_cnpj: company.cnpj,
        contato_phone: `5511${String(90000000 + i).padStart(8, "0")}`,
        phone_number: `5511${String(90000000 + i).padStart(8, "0")}`,
        direction: i % 2 === 0 ? "in" : "out",
        status: i % 3 === 0 ? "lido" : "entregue",
        message_text: `Mensagem de teste ${i + 1}`,
        texto_enviado: i % 2 !== 0 ? `Mensagem enviada ${i + 1}` : null,
        texto_recebido: i % 2 === 0 ? `Mensagem recebida ${i + 1}` : null,
        sentiment_score: Number((Math.random() * 2 - 1).toFixed(2)),
        sentiment_label: sentiment,
        received_at: messageDate.toISOString(),
        timestamp: messageDate.toISOString(),
      });
    }

    const { data: messagesData, error: messagesError } = await supabaseClient
      .from("whatsapp_messages")
      .insert(messages)
      .select();

    if (messagesError && !ignoreMissingTable(messagesError)) {
      results.errors.push(`Erro ao criar mensagens: ${messagesError.message}`);
    } else {
      results.seeded.whatsapp_messages = messagesData?.length || 0;
    }

    // Criar conversas agregadas
    const conversations = companies.map((company, idx) => ({
      company_cnpj: company.cnpj,
      phone_number: messages[idx]?.phone_number ?? `55119999${idx}000`,
      contact_name: `Contato ${idx + 1}`,
      contact_type: idx % 2 === 0 ? "lead" : "cliente",
      last_message_text: messages[idx]?.message_text ?? "",
      last_message_at: messages[idx]?.timestamp ?? new Date().toISOString(),
      unread_count: idx,
      status: idx % 2 === 0 ? "ativo" : "pausado",
      tags: idx % 2 === 0 ? ["vip"] : ["follow-up"],
    }));

    const { data: convData, error: convError } = await supabaseClient
      .from("whatsapp_conversations")
      .upsert(conversations, { onConflict: "company_cnpj,phone_number" })
      .select();

    if (convError && !ignoreMissingTable(convError)) {
      results.errors.push(`Erro ao criar conversas: ${convError.message}`);
    } else {
      results.seeded.whatsapp_conversations = convData?.length || 0;
    }

    // Criar templates WhatsApp
    const templatesPayload = [
      {
        name: "boas_vindas",
        category: "welcome",
        status: "approved",
        provider: "whatsapp",
        language: "pt_BR",
        variables: ["nome"],
        content: {
          header: "Bem-vindo",
          body: "Olá {{nome}}, bem-vindo ao iFinance!",
          footer: "Equipe iFinance",
          variaveisObrigatorias: ["nome"],
          variaveisOpcionais: [],
        },
      },
      {
        name: "cobranca_atraso",
        category: "reminder",
        status: "approved",
        provider: "whatsapp",
        language: "pt_BR",
        variables: ["nome", "valor", "data"],
        content: {
          header: "Aviso de pagamento",
          body: "Olá {{nome}}, identificamos um valor de {{valor}} com vencimento em {{data}}.",
          footer: "Precisando de ajuda? Fale conosco!",
          variaveisObrigatorias: ["nome", "valor", "data"],
          variaveisOpcionais: [],
        },
      },
    ];

    const { data: templatesData, error: templatesError } = await supabaseClient
      .from("whatsapp_templates")
      .upsert(templatesPayload, { onConflict: "name" })
      .select();

    if (templatesError && !ignoreMissingTable(templatesError)) {
      results.errors.push(`Erro ao criar templates: ${templatesError.message}`);
    } else {
      results.seeded.whatsapp_templates = templatesData?.length || 0;
    }

    // Criar mood index timeline
    const moodRecords = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);

      for (const company of companies) {
        moodRecords.push({
          company_cnpj: company.cnpj,
          period_date: date.toISOString().split("T")[0],
          period_type: "day",
          avg_sentiment_score: (Math.random() * 1.5 - 0.5).toFixed(2),
          sentiment_trend: ["improving", "stable", "declining"][Math.floor(Math.random() * 3)],
          very_negative_count: Math.floor(Math.random() * 5),
          negative_count: Math.floor(Math.random() * 10),
          neutral_count: Math.floor(Math.random() * 20),
          positive_count: Math.floor(Math.random() * 15),
          very_positive_count: Math.floor(Math.random() * 10),
          total_messages: Math.floor(Math.random() * 50) + 10,
        });
      }
    }

    const { data: moodData, error: moodError } = await supabaseClient
      .from("mood_index_timeline")
      .upsert(moodRecords, { onConflict: "company_cnpj,period_date,period_type" })
      .select();

    if (moodError && !ignoreMissingTable(moodError)) {
      results.errors.push(`Erro ao criar mood index: ${moodError.message}`);
    } else {
      results.seeded.mood_index = moodData?.length || 0;
    }

    // Criar registros de uso do sistema
    const { data: { users }, error: usersError } = await supabaseClient.auth.admin.listUsers();

    if (usersError) {
      results.errors.push(`Erro ao listar usuários: ${usersError.message}`);
    } else if (users && users.length > 0) {
      const usageRecords = [];

      for (let i = 0; i < (mode === "full" ? 50 : 10); i++) {
        const user = users[i % users.length];
        const daysAgo = Math.floor(Math.random() * 7);
        const sessionDate = new Date(now);
        sessionDate.setDate(now.getDate() - daysAgo);

        usageRecords.push({
          user_id: user.id,
          company_cnpj: companies[i % companies.length].cnpj,
          session_start: sessionDate.toISOString(),
          session_end: new Date(sessionDate.getTime() + Math.random() * 3600000).toISOString(),
          session_duration_seconds: Math.floor(Math.random() * 3600),
          pages_visited: ["/dashboard", "/relatorios", "/empresas"],
          features_used: ["dashboard", "relatorios"],
          api_calls_count: Math.floor(Math.random() * 100),
          api_calls_successful: Math.floor(Math.random() * 90),
          api_calls_failed: Math.floor(Math.random() * 10),
          avg_api_duration_ms: Math.floor(Math.random() * 500),
          llm_interactions_count: Math.floor(Math.random() * 20),
          whatsapp_messages_sent: Math.floor(Math.random() * 30),
          whatsapp_messages_received: Math.floor(Math.random() * 40),
        });
      }

      const { data: usageData, error: usageError } = await supabaseClient
        .from("user_system_usage")
        .insert(usageRecords)
        .select();

      if (usageError && !ignoreMissingTable(usageError)) {
        results.errors.push(`Erro ao criar registros de uso: ${usageError.message}`);
      } else {
        results.seeded.usage_records = usageData?.length || 0;
      }
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
