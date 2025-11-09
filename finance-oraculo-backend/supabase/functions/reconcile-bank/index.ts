import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface BankStatement {
  id: string;
  company_cnpj: string;
  data_movimento: string;
  tipo: string;
  valor: number;
  descricao: string;
  conciliado: boolean;
}

interface CashflowEntry {
  id: number;
  company_cnpj: string;
  date: string;
  kind: string;
  category: string;
  amount: number;
}

interface Reconciliation {
  company_cnpj: string;
  tipo: string;
  bank_statement_id: string;
  cashflow_entry_id: number;
  data_conciliacao: string;
  valor_extrato: number;
  valor_lancamento: number;
  diferenca: number;
  status: string;
  confianca: number;
}

interface FinancialAlert {
  company_cnpj: string;
  tipo_alerta: string;
  prioridade: string;
  titulo: string;
  mensagem: string;
  dados_detalhados: Record<string, unknown>;
  status: string;
  notificado_whatsapp: boolean;
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

    const body = await req.json();
    const { company_cnpj } = body;

    // 1. Get bank statements from ERP (F360/OMIE) - Real-time data
    const getStatementsResponse = await fetch(
      `${supabaseUrl}/functions/v1/get-bank-statements-from-erp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          company_cnpj: company_cnpj || null,
          days_back: 30,
        }),
      }
    );

    const statementsData = await getStatementsResponse.json();
    const unreconciled = statementsData.statements || [];

    if (!unreconciled || unreconciled.length === 0) {
      return corsReply(
        new Response(
          JSON.stringify({
            success: true,
            reconciled: 0,
            alerts_created: 0,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        )
      );
    }

    // 2. For each unreconciled statement, find matching cashflow entries
    const reconciliations: Reconciliation[] = [];
    const alertsToCreate: FinancialAlert[] = [];
    let reconciliationCount = 0;

    for (const stmt of unreconciled as BankStatement[]) {
      // Get cashflow entries from ±3 days
      const dateFrom = new Date(stmt.data_movimento);
      dateFrom.setDate(dateFrom.getDate() - 3);

      const dateTo = new Date(stmt.data_movimento);
      dateTo.setDate(dateTo.getDate() + 3);

      const { data: cashflows } = await supabase
        .from("cashflow_entries")
        .select("*")
        .eq("company_cnpj", stmt.company_cnpj)
        .gte("date", dateFrom.toISOString().split("T")[0])
        .lte("date", dateTo.toISOString().split("T")[0]);

      if (!cashflows || cashflows.length === 0) {
        // Create alert for unmatched movement
        alertsToCreate.push({
          company_cnpj: stmt.company_cnpj,
          tipo_alerta: "lancamento_orfao",
          prioridade: "media",
          titulo: "Movimento bancário sem lançamento correspondente",
          mensagem: `${stmt.data_movimento}: ${stmt.descricao} - R$ ${stmt.valor.toFixed(2)}`,
          dados_detalhados: {
            banco_codigo: stmt.company_cnpj,
            data_movimento: stmt.data_movimento,
            valor: stmt.valor,
            descricao: stmt.descricao,
            tipo: stmt.tipo,
          },
          status: "pendente",
          notificado_whatsapp: false,
        });

        continue;
      }

      // Calculate match scores
      let bestMatch: (CashflowEntry & { score: number; confidence: number }) | null = null;

      for (const cf of cashflows as CashflowEntry[]) {
        // Convert cashflow kind to statement type
        const cfType = cf.kind === "in" ? "credito" : "debito";

        // Check if types match
        if (cfType !== stmt.tipo) {
          continue;
        }

        // Calculate value difference percentage
        const valueDiff = Math.abs(cf.amount - stmt.valor);
        const valueDiffPct = (valueDiff / Math.max(cf.amount, stmt.valor)) * 100;

        // Check if within tolerance (±5%)
        if (valueDiffPct > 5) {
          continue;
        }

        // Calculate date difference
        const cfDate = new Date(cf.date);
        const stmtDate = new Date(stmt.data_movimento);
        const dateDiff = Math.abs(
          Math.floor((cfDate.getTime() - stmtDate.getTime()) / (1000 * 60 * 60 * 24))
        );

        // Calculate score
        const score = calculateMatchScore(dateDiff, valueDiffPct);
        const confidence = score / 100;

        if (!bestMatch || score > bestMatch.score) {
          bestMatch = {
            ...cf,
            score,
            confidence,
          };
        }
      }

      if (bestMatch && bestMatch.score >= 60) {
        // Create reconciliation record
        const recon: Reconciliation = {
          company_cnpj: stmt.company_cnpj,
          tipo: "bancaria",
          bank_statement_id: stmt.id,
          cashflow_entry_id: bestMatch.id,
          data_conciliacao: new Date().toISOString().split("T")[0],
          valor_extrato: stmt.valor,
          valor_lancamento: bestMatch.amount,
          diferenca: Math.abs(stmt.valor - bestMatch.amount),
          status:
            Math.abs(stmt.valor - bestMatch.amount) < 0.01 ? "ok" : "divergente",
          confianca: bestMatch.confidence,
        };

        reconciliations.push(recon);
        reconciliationCount++;

        // Update bank statement as reconciled
        await supabase
          .from("bank_statements")
          .update({
            conciliado: true,
            conciliacao_id: null, // Will be updated after insert
          })
          .eq("id", stmt.id);
      } else {
        // Create alert for divergent values or no match
        if (bestMatch) {
          alertsToCreate.push({
            company_cnpj: stmt.company_cnpj,
            tipo_alerta: "valor_divergente",
            prioridade: "alta",
            titulo: "Valores divergentes em conciliação",
            mensagem: `Extrato: R$ ${stmt.valor.toFixed(2)} | Lançamento: R$ ${bestMatch.amount.toFixed(
              2
            )} (Diferença: ${(
              ((stmt.valor - bestMatch.amount) / Math.max(stmt.valor, bestMatch.amount)) *
              100
            ).toFixed(1)}%)`,
            dados_detalhados: {
              bank_statement_id: stmt.id,
              cashflow_entry_id: bestMatch.id,
              valor_extrato: stmt.valor,
              valor_lancamento: bestMatch.amount,
              diferenca: stmt.valor - bestMatch.amount,
              data_movimento: stmt.data_movimento,
            },
            status: "pendente",
            notificado_whatsapp: false,
          });
        } else {
          alertsToCreate.push({
            company_cnpj: stmt.company_cnpj,
            tipo_alerta: "conciliacao_pendente",
            prioridade: "media",
            titulo: "Conciliação pendente",
            mensagem: `${stmt.data_movimento}: ${stmt.descricao} - R$ ${stmt.valor.toFixed(
              2
            )} - Nenhum lançamento correspondente encontrado`,
            dados_detalhados: {
              bank_statement_id: stmt.id,
              data_movimento: stmt.data_movimento,
              valor: stmt.valor,
              descricao: stmt.descricao,
            },
            status: "pendente",
            notificado_whatsapp: false,
          });
        }
      }
    }

    // 3. Insert reconciliations
    let insertedReconciliations = 0;
    if (reconciliations.length > 0) {
      const { count } = await supabase
        .from("reconciliations")
        .insert(reconciliations);

      insertedReconciliations = count || 0;
    }

    // 4. Insert financial alerts
    let insertedAlerts = 0;
    if (alertsToCreate.length > 0) {
      const { count } = await supabase
        .from("financial_alerts")
        .insert(alertsToCreate);

      insertedAlerts = count || 0;
    }

    return corsReply(
      new Response(
        JSON.stringify({
          success: true,
          statements_processed: unreconciled.length,
          reconciled: insertedReconciliations,
          alerts_created: insertedAlerts,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      )
    );
  } catch (error) {
    console.error("Error in reconcile-bank:", error);

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

function calculateMatchScore(dateDiffDays: number, valueDiffPct: number): number {
  let score = 0;

  // Date score (±3 days = 40 points)
  if (dateDiffDays === 0) {
    score += 40;
  } else if (dateDiffDays === 1) {
    score += 30;
  } else if (dateDiffDays <= 3) {
    score += 20;
  }

  // Amount score (±5% = 50 points)
  if (valueDiffPct < 0.01) {
    score += 50;
  } else if (valueDiffPct < 1) {
    score += 40;
  } else if (valueDiffPct < 5) {
    score += 30;
  }

  return score;
}

