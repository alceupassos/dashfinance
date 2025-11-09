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

interface ImportResult {
  success: boolean;
  imported: number;
  duplicates: number;
  errors: number;
  details?: string[];
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

  if (req.method !== "POST") {
    return corsReply(
      new Response(JSON.stringify({ error: "Method not allowed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      })
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const companyCnpj = formData.get("company_cnpj") as string;
    const bancoCodigo = formData.get("banco_codigo") as string;

    if (!file || !companyCnpj || !bancoCodigo) {
      throw new Error("Missing required fields: file, company_cnpj, banco_codigo");
    }

    // Parse file content
    const fileContent = await file.text();
    const statements = await parseStatementFile(fileContent, companyCnpj, bancoCodigo);

    if (statements.length === 0) {
      throw new Error("No valid records found in file");
    }

    // Check for duplicates
    const existingDocs = await checkDuplicates(supabase, statements);
    const uniqueStatements = statements.filter(
      (stmt) => !existingDocs.has(`${stmt.data_movimento}|${stmt.valor}|${stmt.documento}`)
    );

    // Insert statements
    const insertResult: ImportResult = {
      success: true,
      imported: 0,
      duplicates: statements.length - uniqueStatements.length,
      errors: 0,
      details: [],
    };

    if (uniqueStatements.length > 0) {
      // Insert in batches of 100
      for (let i = 0; i < uniqueStatements.length; i += 100) {
        const batch = uniqueStatements.slice(i, Math.min(i + 100, uniqueStatements.length));

        const { error, count } = await supabase
          .from("bank_statements")
          .insert(batch);

        if (error) {
          insertResult.errors += batch.length;
          insertResult.details?.push(`Batch ${i / 100 + 1}: ${error.message}`);
        } else {
          insertResult.imported += count || batch.length;
        }
      }
    }

    return corsReply(
      new Response(JSON.stringify(insertResult), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      })
    );
  } catch (error) {
    console.error("Error in import-bank-statement:", error);

    return corsReply(
      new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      )
    );
  }
};

async function parseStatementFile(
  content: string,
  companyCnpj: string,
  bancoCodigo: string
): Promise<BankStatementRow[]> {
  const statements: BankStatementRow[] = [];
  const lines = content.split("\n").filter((line) => line.trim());

  // Try to detect format: CSV, OFX, or plain text
  if (content.includes("<?xml") || content.includes("<OFX>")) {
    // OFX Format
    return parseOFX(content, companyCnpj, bancoCodigo);
  } else if (lines[0].includes(",") || lines[0].includes(";")) {
    // CSV Format
    return parseCSV(content, companyCnpj, bancoCodigo);
  } else {
    // Plain text format
    return parsePlainText(content, companyCnpj, bancoCodigo);
  }
}

function parseOFX(
  content: string,
  companyCnpj: string,
  bancoCodigo: string
): BankStatementRow[] {
  const statements: BankStatementRow[] = [];

  // Extract transactions from OFX format
  const transactionRegex =
    /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  const trnTypeRegex = /<TRNTYPE>(\w+)/i;
  const dtpostedRegex = /<DTPOSTED>(\d{8})/i;
  const trnAmtRegex = /<TRNAMT>([-\d.]+)/i;
  const fitidRegex = /<FITID>([^\n<]+)/i;
  const memoRegex = /<MEMO>([^\n<]+)/i;

  let match;
  while ((match = transactionRegex.exec(content)) !== null) {
    const transaction = match[1];

    const type = transaction.match(trnTypeRegex)?.[1] || "";
    const date = transaction.match(dtpostedRegex)?.[1];
    const amount = transaction.match(trnAmtRegex)?.[1];
    const id = transaction.match(fitidRegex)?.[1];
    const memo = transaction.match(memoRegex)?.[1];

    if (date && amount) {
      const dateStr = `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(
        6,
        8
      )}`;
      const valor = Math.abs(parseFloat(amount));

      statements.push({
        company_cnpj: companyCnpj,
        banco_codigo: bancoCodigo,
        data_movimento: dateStr,
        tipo: parseFloat(amount) >= 0 ? "credito" : "debito",
        valor,
        descricao: memo || `Transação ${type}`,
        documento: id,
      });
    }
  }

  return statements;
}

function parseCSV(
  content: string,
  companyCnpj: string,
  bancoCodigo: string
): BankStatementRow[] {
  const statements: BankStatementRow[] = [];
  const delimiter = content.includes(";") ? ";" : ",";
  const lines = content.split("\n");

  // Skip header row if present
  let startIdx = 0;
  if (lines[0].toLowerCase().includes("data")) {
    startIdx = 1;
  }

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(delimiter).map((p) => p.trim());

    // Expected format: data, tipo, valor, descricao, documento, saldo
    if (parts.length >= 3) {
      const dateStr = parseDateString(parts[0]);
      const tipo = (parts[1] || "")
        .toLowerCase()
        .includes("cred")
        ? "credito"
        : "debito";
      const valor = parseFloat(parts[2].replace(/[^\d.,]/g, "").replace(",", "."));

      if (dateStr && !isNaN(valor)) {
        statements.push({
          company_cnpj: companyCnpj,
          banco_codigo: bancoCodigo,
          data_movimento: dateStr,
          tipo,
          valor: Math.abs(valor),
          descricao: parts[3] || "",
          documento: parts[4],
          saldo: parts[5] ? parseFloat(parts[5]) : undefined,
        });
      }
    }
  }

  return statements;
}

function parsePlainText(
  content: string,
  companyCnpj: string,
  bancoCodigo: string
): BankStatementRow[] {
  const statements: BankStatementRow[] = [];
  const lines = content.split("\n");

  // Pattern: DD/MM/YYYY | Tipo | R$ Valor | Descrição
  const pattern =
    /(\d{1,2}\/\d{1,2}\/\d{4})\s*\|\s*(crédito|débito|c|d)\s*\|\s*r?\$?\s*([\d.,]+)\s*\|\s*(.+?)(?:\||$)/i;

  for (const line of lines) {
    const match = line.match(pattern);
    if (match) {
      const dateStr = parseDateString(match[1]);
      const tipo = match[2].toLowerCase().startsWith("c")
        ? "credito"
        : "debito";
      const valor = parseFloat(
        match[3].replace(/[^\d.,]/g, "").replace(",", ".")
      );
      const descricao = match[4].trim();

      if (dateStr && !isNaN(valor)) {
        statements.push({
          company_cnpj: companyCnpj,
          banco_codigo: bancoCodigo,
          data_movimento: dateStr,
          tipo,
          valor: Math.abs(valor),
          descricao,
        });
      }
    }
  }

  return statements;
}

function parseDateString(dateStr: string): string {
  // Try various date formats
  const formats = [
    /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
    /(\d{8})/, // DDMMYYYY
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let year, month, day;

      if (match[3].length === 4) {
        // DD/MM/YYYY or DD-MM-YYYY
        day = match[1];
        month = match[2];
        year = match[3];
      } else if (match[1].length === 4) {
        // YYYY-MM-DD
        year = match[1];
        month = match[2];
        day = match[3];
      } else if (match[0].length === 8) {
        // DDMMYYYY
        day = match[0].substring(0, 2);
        month = match[0].substring(2, 4);
        year = match[0].substring(4, 8);
      } else {
        continue;
      }

      try {
        const date = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day)
        );
        if (!isNaN(date.getTime())) {
          return date.toISOString().split("T")[0];
        }
      } catch {
        continue;
      }
    }
  }

  return "";
}

async function checkDuplicates(
  supabase: ReturnType<typeof createClient>,
  statements: BankStatementRow[]
): Promise<Set<string>> {
  const existing = new Set<string>();

  // Get unique dates from statements
  const dates = [...new Set(statements.map((s) => s.data_movimento))];

  for (const date of dates) {
    const { data } = await supabase
      .from("bank_statements")
      .select("data_movimento, valor, documento")
      .eq("data_movimento", date);

    if (data) {
      for (const row of data) {
        existing.add(`${row.data_movimento}|${row.valor}|${row.documento}`);
      }
    }
  }

  return existing;
}

