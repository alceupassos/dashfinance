import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface BankAccount {
  banco_codigo: string;
  agencia: string;
  conta: string;
  tipo: string; // corrente, poupança, etc
  titular: string;
}

interface SyncResult {
  company_cnpj: string;
  contas_sincronizadas: number;
  fonte: "F360" | "OMIE";
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

    const results: SyncResult[] = [];

    // 1. Sync F360 bank metadata
    try {
      const f360Accounts = await getF360BankAccounts(supabase, company_cnpj);

      for (const account of f360Accounts) {
        await upsertBankMetadata(supabase, company_cnpj, account, "F360");
      }

      results.push({
        company_cnpj,
        contas_sincronizadas: f360Accounts.length,
        fonte: "F360",
      });
    } catch (error) {
      console.error("Error syncing F360 metadata:", error);
    }

    // 2. Sync OMIE bank metadata
    try {
      const omieAccounts = await getOMIEBankAccounts(supabase, company_cnpj);

      for (const account of omieAccounts) {
        await upsertBankMetadata(supabase, company_cnpj, account, "OMIE");
      }

      results.push({
        company_cnpj,
        contas_sincronizadas: omieAccounts.length,
        fonte: "OMIE",
      });
    } catch (error) {
      console.error("Error syncing OMIE metadata:", error);
    }

    return corsReply(
      new Response(
        JSON.stringify({
          success: true,
          results,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      )
    );
  } catch (error) {
    console.error("Error in sync-bank-metadata:", error);

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

async function getF360BankAccounts(
  supabase: ReturnType<typeof createClient>,
  companyCnpj?: string
): Promise<BankAccount[]> {
  // Get F360 integrations for this company
  const { data: f360Configs } = await supabase
    .from("integration_f360")
    .select("*");

  if (!f360Configs || f360Configs.length === 0) {
    return [];
  }

  const accounts: BankAccount[] = [];

  for (const config of f360Configs) {
    // In real implementation, would call F360 API to get actual accounts
    // For now, simulate with common Brazilian bank codes
    const bankCodes = ["001", "033", "237", "104", "748"];

    for (const code of bankCodes) {
      accounts.push({
        banco_codigo: code,
        agencia: "0001",
        conta: "123456",
        tipo: "corrente",
        titular: config.cliente_nome,
      });
    }
  }

  return accounts;
}

async function getOMIEBankAccounts(
  supabase: ReturnType<typeof createClient>,
  companyCnpj?: string
): Promise<BankAccount[]> {
  // Get OMIE integrations for this company
  const { data: omieConfigs } = await supabase
    .from("integration_omie")
    .select("*");

  if (!omieConfigs || omieConfigs.length === 0) {
    return [];
  }

  const accounts: BankAccount[] = [];

  for (const config of omieConfigs) {
    // In real implementation, would call OMIE API to get actual accounts
    // For now, simulate with common Brazilian bank codes
    const bankCodes = ["001", "033", "237", "104", "748"];

    for (const code of bankCodes) {
      accounts.push({
        banco_codigo: code,
        agencia: "0002",
        conta: "654321",
        tipo: "corrente",
        titular: config.cliente_nome,
      });
    }
  }

  return accounts;
}

async function upsertBankMetadata(
  supabase: ReturnType<typeof createClient>,
  companyCnpj: string,
  account: BankAccount,
  source: "F360" | "OMIE"
) {
  const { error } = await supabase.from("bank_statements").upsert(
    {
      company_cnpj: companyCnpj,
      banco_codigo: account.banco_codigo,
      agencia: account.agencia,
      conta: account.conta,
      data_movimento: new Date().toISOString().split("T")[0],
      tipo: "metadata",
      valor: 0,
      descricao: `Metadado sincronizado de ${source}`,
      conciliado: false,
    },
    {
      onConflict: "company_cnpj,banco_codigo,agencia,conta",
    }
  );

  if (error) {
    console.error("Error upserting bank metadata:", error);
  }
}

