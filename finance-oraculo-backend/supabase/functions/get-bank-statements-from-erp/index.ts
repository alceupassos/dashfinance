import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface BankStatementRow {
  company_cnpj: string;
  banco_codigo: string;
  agencia?: string;
  conta?: string;
  data_movimento: string;
  tipo: "credito" | "debito";
  valor: number;
  descricao: string;
  documento?: string;
  saldo?: number;
}

interface QueryParams {
  company_cnpj: string;
  banco_codigo?: string;
  data_from?: string;
  data_to?: string;
  days_back?: number; // Default: 30
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
    const params: QueryParams = {
      company_cnpj: body.company_cnpj,
      banco_codigo: body.banco_codigo,
      data_from: body.data_from,
      data_to: body.data_to,
      days_back: body.days_back || 30,
    };

    if (!params.company_cnpj) {
      throw new Error("Missing company_cnpj");
    }

    // Calculate date range
    const today = new Date();
    const fromDate = params.data_from
      ? new Date(params.data_from)
      : new Date(today.getTime() - params.days_back * 24 * 60 * 60 * 1000);
    const toDate = params.data_to ? new Date(params.data_to) : today;

    const statements: BankStatementRow[] = [];

    // 1. Try to fetch from F360
    try {
      const f360Statements = await getF360Statements(supabase, params, fromDate, toDate);
      statements.push(...f360Statements);
    } catch (error) {
      console.warn("Error fetching F360 statements:", error);
    }

    // 2. Try to fetch from OMIE
    try {
      const omieStatements = await getOMIEStatements(supabase, params, fromDate, toDate);
      statements.push(...omieStatements);
    } catch (error) {
      console.warn("Error fetching OMIE statements:", error);
    }

    // Deduplicate and sort
    const uniqueStatements = deduplicateStatements(statements);
    uniqueStatements.sort(
      (a, b) =>
        new Date(a.data_movimento).getTime() - new Date(b.data_movimento).getTime()
    );

    return corsReply(
      new Response(
        JSON.stringify({
          success: true,
          total: uniqueStatements.length,
          statements: uniqueStatements,
          period: {
            from: fromDate.toISOString().split("T")[0],
            to: toDate.toISOString().split("T")[0],
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      )
    );
  } catch (error) {
    console.error("Error in get-bank-statements-from-erp:", error);

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

async function getF360Statements(
  supabase: ReturnType<typeof createClient>,
  params: QueryParams,
  fromDate: Date,
  toDate: Date
): Promise<BankStatementRow[]> {
  // Busca dados de dre_entries e cashflow_entries que foram sincronizados do F360
  // Isso mapeia os dados contábeis como se fossem movimentos bancários

  const { data: cashflowEntries, error } = await supabase
    .from("cashflow_entries")
    .select("*")
    .eq("company_cnpj", params.company_cnpj)
    .gte("date", fromDate.toISOString().split("T")[0])
    .lte("date", toDate.toISOString().split("T")[0]);

  if (error || !cashflowEntries) {
    throw error;
  }

  // Mapear cashflow para bank statements
  return cashflowEntries.map((cf: any) => ({
    company_cnpj: params.company_cnpj,
    banco_codigo: params.banco_codigo || "999", // F360 bank code placeholder
    agencia: "0001",
    conta: "F360",
    data_movimento: cf.date,
    tipo: cf.kind === "in" ? "credito" : "debito",
    valor: cf.amount,
    descricao: cf.category || "F360 - Movimento sincronizado",
    documento: `F360-${cf.id}`,
  }));
}

async function getOMIEStatements(
  supabase: ReturnType<typeof createClient>,
  params: QueryParams,
  fromDate: Date,
  toDate: Date
): Promise<BankStatementRow[]> {
  // Busca dados de dre_entries e cashflow_entries que foram sincronizados do OMIE
  // Isso mapeia os dados contábeis como se fossem movimentos bancários

  const { data: cashflowEntries, error } = await supabase
    .from("cashflow_entries")
    .select("*")
    .eq("company_cnpj", params.company_cnpj)
    .gte("date", fromDate.toISOString().split("T")[0])
    .lte("date", toDate.toISOString().split("T")[0]);

  if (error || !cashflowEntries) {
    throw error;
  }

  // Mapear cashflow para bank statements
  return cashflowEntries.map((cf: any) => ({
    company_cnpj: params.company_cnpj,
    banco_codigo: params.banco_codigo || "888", // OMIE bank code placeholder
    agencia: "0002",
    conta: "OMIE",
    data_movimento: cf.date,
    tipo: cf.kind === "in" ? "credito" : "debito",
    valor: cf.amount,
    descricao: cf.category || "OMIE - Movimento sincronizado",
    documento: `OMIE-${cf.id}`,
  }));
}

function deduplicateStatements(statements: BankStatementRow[]): BankStatementRow[] {
  const seen = new Set<string>();
  const unique: BankStatementRow[] = [];

  for (const stmt of statements) {
    const key = `${stmt.data_movimento}|${stmt.valor}|${stmt.descricao}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(stmt);
    }
  }

  return unique;
}

