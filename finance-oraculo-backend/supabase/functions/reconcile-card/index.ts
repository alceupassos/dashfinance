import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface CardTransaction {
  id: string;
  company_cnpj: string;
  operadora: string;
  bandeira: string;
  data_venda: string;
  valor_bruto: number;
  taxa_percentual?: number;
  taxa_valor?: number;
  valor_liquido: number;
  conciliado: boolean;
}

interface BankStatement {
  id: string;
  company_cnpj: string;
  data_movimento: string;
  tipo: string;
  valor: number;
  descricao: string;
}

interface Reconciliation {
  company_cnpj: string;
  tipo: string;
  card_transaction_id: string;
  bank_statement_id: string;
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

const OPERATOR_FEES: Record<string, Record<string, number>> = {
  stone: { visa: 2.5, master: 2.75, elo: 2.65 },
  cielo: { visa: 2.99, master: 3.19, elo: 2.99 },
  rede: { visa: 2.8, master: 3.0, elo: 2.9 },
  "global-payments": { visa: 2.7, master: 2.95, elo: 2.8 },
  getnet: { visa: 2.5, master: 2.7, elo: 2.6 },
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

    // 1. Get unreconciled card transactions
    const { data: unreconciled } = await supabase
      .from("card_transactions")
      .select("*")
      .eq("conciliado", false)
      .eq("company_cnpj", company_cnpj || undefined)
      .order("data_venda", { ascending: false });

    if (!unreconciled || unreconciled.length === 0) {
      return corsReply(
        new Response(
          JSON.stringify({
            success: true,
            reconciled: 0,
            validated_fees: 0,
            alerts_created: 0,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        )
      );
    }

    const reconciliations: Reconciliation[] = [];
    const alertsToCreate: FinancialAlert[] = [];
    let feeValidationsCount = 0;

    for (const card of unreconciled as CardTransaction[]) {
      // 1. Validate fee rate
      const expectedFee = getExpectedFeeRate(
        card.operadora.toLowerCase(),
        (card.bandeira || "visa").toLowerCase()
      );

      let feeAlert = null;

      if (card.taxa_percentual && expectedFee) {
        const feeDiff = card.taxa_percentual - expectedFee;
        const feeDiffPct = ((feeDiff / expectedFee) * 100).toFixed(2);

        if (Math.abs(feeDiff) > 0.1) {
          // More than 0.1% difference
          feeAlert = {
            company_cnpj: card.company_cnpj,
            tipo_alerta: "taxa_divergente",
            prioridade: Math.abs(feeDiff) > 1 ? "alta" : "media",
            titulo: `Taxa de cartão ${card.operadora} divergente`,
            mensagem: `Bandeira: ${card.bandeira} | Taxa esperada: ${expectedFee}% | Taxa cobrada: ${card.taxa_percentual}% | Diferença: ${feeDiffPct}%`,
            dados_detalhados: {
              operadora: card.operadora,
              bandeira: card.bandeira,
              taxa_esperada: expectedFee,
              taxa_cobrada: card.taxa_percentual,
              diferenca_percentual: feeDiff,
              data_venda: card.data_venda,
              valor_bruto: card.valor_bruto,
            },
            status: "pendente",
            notificado_whatsapp: false,
          };

          alertsToCreate.push(feeAlert);
          feeValidationsCount++;
        }
      }

      // 2. Search for matching bank statement (expected received date ±3 days)
      const expectedDate = new Date(card.data_venda);
      
      // Add standard processing days (usually 2-3 days for card settlement)
      expectedDate.setDate(expectedDate.getDate() + 2);

      const dateFrom = new Date(expectedDate);
      dateFrom.setDate(dateFrom.getDate() - 3);

      const dateTo = new Date(expectedDate);
      dateTo.setDate(dateTo.getDate() + 3);

      const { data: bankStatements } = await supabase
        .from("bank_statements")
        .select("*")
        .eq("company_cnpj", card.company_cnpj)
        .eq("tipo", "credito") // Card settlements are always credits
        .gte("data_movimento", dateFrom.toISOString().split("T")[0])
        .lte("data_movimento", dateTo.toISOString().split("T")[0]);

      if (!bankStatements || bankStatements.length === 0) {
        // No matching bank statement found
        alertsToCreate.push({
          company_cnpj: card.company_cnpj,
          tipo_alerta: "pagamento_nao_encontrado",
          prioridade: "alta",
          titulo: "Recebimento de cartão não encontrado no extrato",
          mensagem: `${card.operadora} | Valor esperado: R$ ${card.valor_liquido.toFixed(
            2
          )} | Data esperada: ~${expectedDate.toLocaleDateString("pt-BR")}`,
          dados_detalhados: {
            card_transaction_id: card.id,
            operadora: card.operadora,
            valor_liquido: card.valor_liquido,
            data_esperada: expectedDate.toISOString().split("T")[0],
            data_venda: card.data_venda,
          },
          status: "pendente",
          notificado_whatsapp: false,
        });

        continue;
      }

      // Find best match in bank statements
      let bestMatch: (BankStatement & { confidence: number; score: number }) | null = null;

      for (const stmt of bankStatements as BankStatement[]) {
        // Check value tolerance (±2% for card settlements)
        const valueDiff = Math.abs(stmt.valor - card.valor_liquido);
        const valueDiffPct = (valueDiff / Math.max(stmt.valor, card.valor_liquido)) * 100;

        if (valueDiffPct > 2) {
          continue;
        }

        // Calculate date difference
        const stmtDate = new Date(stmt.data_movimento);
        const cardDate = new Date(expectedDate.toISOString().split("T")[0]);
        const dateDiff = Math.abs(
          Math.floor((stmtDate.getTime() - cardDate.getTime()) / (1000 * 60 * 60 * 24))
        );

        const score = calculateCardMatchScore(dateDiff, valueDiffPct);
        const confidence = score / 100;

        if (!bestMatch || score > bestMatch.score) {
          bestMatch = {
            ...stmt,
            confidence,
            score,
          };
        }
      }

      if (bestMatch && bestMatch.score >= 70) {
        // Create reconciliation
        const recon: Reconciliation = {
          company_cnpj: card.company_cnpj,
          tipo: "cartao",
          card_transaction_id: card.id,
          bank_statement_id: bestMatch.id,
          data_conciliacao: new Date().toISOString().split("T")[0],
          valor_extrato: bestMatch.valor,
          valor_lancamento: card.valor_liquido,
          diferenca: Math.abs(bestMatch.valor - card.valor_liquido),
          status:
            Math.abs(bestMatch.valor - card.valor_liquido) < 0.01
              ? "ok"
              : "divergente",
          confianca: bestMatch.confidence,
        };

        reconciliations.push(recon);

        // Update card transaction as reconciled
        await supabase
          .from("card_transactions")
          .update({
            conciliado: true,
            data_recebimento: bestMatch.data_movimento,
          })
          .eq("id", card.id);
      } else if (bestMatch) {
        // Match found but with divergence
        alertsToCreate.push({
          company_cnpj: card.company_cnpj,
          tipo_alerta: "valor_divergente",
          prioridade: "media",
          titulo: "Valor de cartão divergente no extrato",
          mensagem: `${card.operadora} | Valor esperado: R$ ${card.valor_liquido.toFixed(
            2
          )} | Valor encontrado: R$ ${bestMatch.valor.toFixed(2)}`,
          dados_detalhados: {
            card_transaction_id: card.id,
            bank_statement_id: bestMatch.id,
            valor_liquido: card.valor_liquido,
            valor_extrato: bestMatch.valor,
            diferenca: bestMatch.valor - card.valor_liquido,
            operadora: card.operadora,
          },
          status: "pendente",
          notificado_whatsapp: false,
        });
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
          transactions_processed: unreconciled.length,
          reconciled: insertedReconciliations,
          validated_fees: feeValidationsCount,
          alerts_created: insertedAlerts,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      )
    );
  } catch (error) {
    console.error("Error in reconcile-card:", error);

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

function getExpectedFeeRate(
  operadora: string,
  bandeira: string
): number | null {
  const normalizedOp = operadora.toLowerCase().trim();

  // Find operator (fuzzy match)
  for (const [op, rates] of Object.entries(OPERATOR_FEES)) {
    if (normalizedOp.includes(op) || op.includes(normalizedOp)) {
      const normalizedBandeira = bandeira.toLowerCase().trim();

      // Find bandeira (fuzzy match)
      for (const [band, rate] of Object.entries(rates)) {
        if (
          normalizedBandeira.includes(band) ||
          band.includes(normalizedBandeira)
        ) {
          return rate;
        }
      }

      // Return operator default (first rate)
      return Object.values(rates)[0];
    }
  }

  return null;
}

function calculateCardMatchScore(
  dateDiffDays: number,
  valueDiffPct: number
): number {
  let score = 0;

  // Date score (±3 days = 40 points)
  if (dateDiffDays === 0) {
    score += 40;
  } else if (dateDiffDays === 1) {
    score += 30;
  } else if (dateDiffDays <= 3) {
    score += 20;
  }

  // Amount score (±2% = 60 points for card)
  if (valueDiffPct < 0.01) {
    score += 60;
  } else if (valueDiffPct < 0.5) {
    score += 50;
  } else if (valueDiffPct < 1) {
    score += 40;
  } else if (valueDiffPct < 2) {
    score += 30;
  }

  return score;
}

