import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ContractFee {
  id: string;
  company_cnpj: string;
  tipo: string;
  taxa_percentual?: number;
  taxa_fixa?: number;
  banco_codigo?: string;
  vigencia_inicio: string;
  vigencia_fim?: string;
  ativo: boolean;
}

interface BankStatement {
  id: string;
  company_cnpj: string;
  banco_codigo: string;
  data_movimento: string;
  tipo: string;
  valor: number;
  descricao: string;
  documento?: string;
}

interface FeeValidation {
  company_cnpj: string;
  tipo_operacao: string;
  bank_statement_id: string;
  contract_fee_id: string;
  data_operacao: string;
  valor_operacao: number;
  taxa_esperada: number;
  taxa_cobrada: number;
  diferenca: number;
  percentual_diferenca: number;
  status: string;
  documento?: string;
  banco_codigo: string;
}

interface FinancialAlert {
  company_cnpj: string;
  tipo_alerta: string;
  prioridade: string;
  titulo: string;
  mensagem: string;
  dados_detalhados: Record<string, unknown>;
  fee_validation_id?: string;
  status: string;
  notificado_whatsapp: boolean;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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

    // Parse request body
    const body = await req.json();
    const companyFilter = body.company_cnpj; // Optional: validate specific company

    // 1. Get all unvalidated bank statements from last 7 days
    const { data: statements, error: stmtError } = await supabase
      .from("bank_statements")
      .select("*")
      .gte("data_movimento", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0])
      .order("data_movimento", { ascending: false });

    if (stmtError) throw stmtError;

    if (!statements || statements.length === 0) {
      return corsReply(
        new Response(
          JSON.stringify({ success: true, validated: 0, alerts_created: 0 }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        )
      );
    }

    // 2. For each statement, find applicable fees and validate
    const feeValidations: FeeValidation[] = [];
    const alertsToCreate: FinancialAlert[] = [];
    const companiesProcessed = new Set<string>();

    for (const stmt of statements as BankStatement[]) {
      // Skip if company filter is set and doesn't match
      if (companyFilter && stmt.company_cnpj !== companyFilter) {
        continue;
      }

      companiesProcessed.add(stmt.company_cnpj);

      // Get applicable fees for this statement
      const { data: fees, error: feesError } = await supabase
        .from("contract_fees")
        .select("*")
        .eq("company_cnpj", stmt.company_cnpj)
        .eq("ativo", true)
        .eq("banco_codigo", stmt.banco_codigo)
        .or(`tipo.eq.${getOperationType(stmt.descricao)}`)
        .lte("vigencia_inicio", stmt.data_movimento)
        .or(`vigencia_fim.is.null,vigencia_fim.gte.${stmt.data_movimento}`);

      if (feesError) continue;

      if (!fees || fees.length === 0) {
        continue; // No applicable fees
      }

      for (const fee of fees as ContractFee[]) {
        // Try to extract fee amount from statement description
        const feeExtracted = extractFeeFromStatement(stmt);

        if (!feeExtracted) {
          continue; // Cannot identify fee in statement
        }

        // Calculate expected fee
        const expectedFee = calculateExpectedFee(fee, stmt.valor);
        const difference = feeExtracted - expectedFee;
        const percentDiff = (difference / expectedFee) * 100;

        // Create validation record
        const validation: FeeValidation = {
          company_cnpj: stmt.company_cnpj,
          tipo_operacao: fee.tipo,
          bank_statement_id: stmt.id,
          contract_fee_id: fee.id,
          data_operacao: stmt.data_movimento,
          valor_operacao: stmt.valor,
          taxa_esperada: expectedFee,
          taxa_cobrada: feeExtracted,
          diferenca: difference,
          percentual_diferenca: percentDiff,
          status: Math.abs(percentDiff) > 2 ? "divergente" : "ok",
          documento: stmt.documento,
          banco_codigo: stmt.banco_codigo,
        };

        feeValidations.push(validation);

        // Create alert if divergent
        if (validation.status === "divergente") {
          const prioridade =
            Math.abs(difference) > 100
              ? "critica"
              : Math.abs(difference) > 50
              ? "alta"
              : "media";

          const alert: FinancialAlert = {
            company_cnpj: stmt.company_cnpj,
            tipo_alerta: "taxa_divergente",
            prioridade,
            titulo: `Taxa ${validation.tipo_operacao} divergente - ${stmt.banco_codigo}`,
            mensagem: `Taxa cobrada: R$ ${feeExtracted.toFixed(2)} (esperado: R$ ${expectedFee.toFixed(2)}) - Diferença: ${percentDiff > 0 ? "+" : ""}${percentDiff.toFixed(1)}%`,
            dados_detalhados: {
              tipo_operacao: validation.tipo_operacao,
              banco_codigo: stmt.banco_codigo,
              documento: stmt.documento,
              data_operacao: stmt.data_movimento,
              taxa_esperada: expectedFee,
              taxa_cobrada: feeExtracted,
              diferenca: difference,
              percentual_diferenca: percentDiff,
            },
            status: "pendente",
            notificado_whatsapp: false,
          };

          alertsToCreate.push(alert);
        }
      }
    }

    // 3. Insert fee validations
    if (feeValidations.length > 0) {
      const { error: insertError } = await supabase
        .from("fee_validations")
        .insert(feeValidations);

      if (insertError) {
        console.error("Error inserting fee validations:", insertError);
      }
    }

    // 4. Insert financial alerts
    if (alertsToCreate.length > 0) {
      const { data: createdAlerts, error: alertError } = await supabase
        .from("financial_alerts")
        .insert(alertsToCreate)
        .select("*");

      if (alertError) {
        console.error("Error inserting alerts:", alertError);
      }

      // 5. Send WhatsApp notifications for each alert
      if (createdAlerts && createdAlerts.length > 0) {
        for (const alert of createdAlerts) {
          await notifyWhatsApp(supabase, alert);
        }
      }
    }

    return corsReply(
      new Response(
        JSON.stringify({
          success: true,
          companies_processed: companiesProcessed.size,
          fee_validations: feeValidations.length,
          alerts_created: alertsToCreate.length,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      )
    );
  } catch (error) {
    console.error("Error in validate-fees:", error);

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

function getOperationType(description: string): string {
  const desc = description.toLowerCase();

  if (desc.includes("boleto") || desc.includes("emissão")) {
    return "boleto_emissao";
  } else if (desc.includes("pix")) {
    return "pix";
  } else if (desc.includes("ted")) {
    return "ted";
  } else if (desc.includes("cartão") || desc.includes("credito")) {
    return "cartao_credito";
  }

  return "tarifa_manutencao";
}

function extractFeeFromStatement(stmt: BankStatement): number | null {
  // Try to extract fee amount from description patterns
  // Examples: "Taxa Boleto R$ 2,50", "Tarifa PIX 0,00", etc.

  const patterns = [
    /taxa.*?r?\s*\$?\s*([\d.,]+)/i,
    /tarifa.*?r?\s*\$?\s*([\d.,]+)/i,
    /fee.*?r?\s*\$?\s*([\d.,]+)/i,
  ];

  for (const pattern of patterns) {
    const match = stmt.descricao.match(pattern);
    if (match) {
      const feeStr = match[1].replace(".", "").replace(",", ".");
      return parseFloat(feeStr);
    }
  }

  return null;
}

function calculateExpectedFee(fee: ContractFee, amount: number): number {
  let calculatedFee = 0;

  if (fee.taxa_fixa) {
    calculatedFee += fee.taxa_fixa;
  }

  if (fee.taxa_percentual) {
    calculatedFee += (amount * fee.taxa_percentual) / 100;
  }

  return calculatedFee;
}

async function notifyWhatsApp(
  supabase: ReturnType<typeof createClient>,
  alert: FinancialAlert
) {
  try {
    // Get client contact info
    const { data: client } = await supabase
      .from("clients")
      .select("codigo_whatsapp, nome")
      .eq("cnpj", alert.company_cnpj)
      .single();

    if (!client || !client.codigo_whatsapp) {
      return;
    }

    // Format alert message for WhatsApp
    const message = formatAlertMessage(alert, client.nome);

    // Call WhatsApp function (assuming wasender-send-message exists)
    const waResponse = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/wasender-send-message`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          to: client.codigo_whatsapp,
          message,
        }),
      }
    );

    if (waResponse.ok) {
      // Mark alert as notified
      await supabase
        .from("financial_alerts")
        .update({
          notificado_whatsapp: true,
          notificado_whatsapp_em: new Date().toISOString(),
        })
        .eq("id", alert.id);
    }
  } catch (error) {
    console.error("Error sending WhatsApp notification:", error);
  }
}

function formatAlertMessage(alert: FinancialAlert, company: string): string {
  const emoji =
    alert.prioridade === "critica"
      ? "🚨"
      : alert.prioridade === "alta"
      ? "⚠️"
      : "ℹ️";

  const data = alert.dados_detalhados as Record<string, unknown>;

  return `${emoji} *ALERTA FINANCEIRO - ${company}*

*Tipo:* ${alert.titulo}
*Prioridade:* ${alert.prioridade.toUpperCase()}

${alert.mensagem}

💰 *Detalhes:*
Taxa esperada: R$ ${(data.taxa_esperada as number).toFixed(2)}
Taxa cobrada: R$ ${(data.taxa_cobrada as number).toFixed(2)}
Diferença: ${(data.percentual_diferenca as number) > 0 ? "+" : ""}${((data.percentual_diferenca as number).toFixed(1))}%

🏦 Banco: ${data.banco_codigo}
📄 Documento: ${data.documento || "N/A"}

✅ *Ação Necessária:*
Entre em contato com o banco para contestar a cobrança incorreta.
Referência: ALT-${alert.id?.slice(0, 8)}`;
}
