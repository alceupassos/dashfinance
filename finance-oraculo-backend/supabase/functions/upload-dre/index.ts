import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  upsertDreEntries,
  upsertCashflowEntries,
  onlyDigits,
  corsHeaders,
  DreEntry,
  CashflowEntry,
} from '../common/db.ts';

// Usar fetch dinâmico para SheetJS
const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm');

interface UploadResult {
  success: boolean;
  inserted: {
    dre: number;
    cashflow: number;
  };
  errors: string[];
  summary: {
    companies: string[];
    period: {
      from: string;
      to: string;
    };
  };
}

function parseExcelToDre(workbook: any, cnpj: string): DreEntry[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);

  const entries: DreEntry[] = [];

  for (const row of data) {
    const record: any = row;

    if (!record['Data'] || !record['Conta'] || !record['Valor']) {
      continue;
    }

    let nature: 'receita' | 'custo' | 'despesa' | 'outras' = 'outras';

    const conta = String(record['Conta']).toLowerCase();

    if (conta.includes('receita') || conta.includes('vendas') || conta.includes('faturamento')) {
      nature = 'receita';
    } else if (conta.includes('custo') || conta.includes('cogs') || conta.includes('cmv')) {
      nature = 'custo';
    } else if (conta.includes('despesa') || conta.includes('administrativa') || conta.includes('comercial')) {
      nature = 'despesa';
    }

    const tipo = String(record['Tipo'] || '').toLowerCase();
    if (tipo === 'receita') nature = 'receita';
    if (tipo === 'custo') nature = 'custo';
    if (tipo === 'despesa') nature = 'despesa';

    let date: string;
    if (typeof record['Data'] === 'number') {
      const excelDate = XLSX.SSF.parse_date_code(record['Data']);
      date = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
    } else {
      date = String(record['Data']).split('T')[0];
    }

    entries.push({
      company_cnpj: onlyDigits(cnpj),
      company_nome: record['Empresa'] || undefined,
      date,
      account: String(record['Conta']),
      nature,
      amount: Number(record['Valor']),
    });
  }

  return entries;
}

function parseExcelToCashflow(workbook: any, cnpj: string): CashflowEntry[] {
  if (workbook.SheetNames.length < 2) {
    return [];
  }

  const sheet = workbook.Sheets[workbook.SheetNames[1]];
  const data = XLSX.utils.sheet_to_json(sheet);

  const entries: CashflowEntry[] = [];

  for (const row of data) {
    const record: any = row;

    if (!record['Data'] || !record['Valor']) {
      continue;
    }

    let kind: 'in' | 'out' = 'in';
    const valor = Number(record['Valor']);

    if (valor < 0) {
      kind = 'out';
    }

    const tipo = String(record['Tipo'] || '').toLowerCase();
    if (tipo.includes('saída') || tipo.includes('out') || tipo.includes('pagamento')) {
      kind = 'out';
    }
    if (tipo.includes('entrada') || tipo.includes('in') || tipo.includes('recebimento')) {
      kind = 'in';
    }

    let date: string;
    if (typeof record['Data'] === 'number') {
      const excelDate = XLSX.SSF.parse_date_code(record['Data']);
      date = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
    } else {
      date = String(record['Data']).split('T')[0];
    }

    entries.push({
      company_cnpj: onlyDigits(cnpj),
      company_nome: record['Empresa'] || undefined,
      date,
      kind,
      category: record['Categoria'] || 'Sem categoria',
      amount: Math.abs(valor),
    });
  }

  return entries;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const cnpj = formData.get('cnpj') as string;

    if (!file || !cnpj) {
      return new Response(
        JSON.stringify({ error: 'File and CNPJ are required' }),
        {
          status: 400,
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
        }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    const dreEntries = parseExcelToDre(workbook, cnpj);
    const cashflowEntries = parseExcelToCashflow(workbook, cnpj);

    const errors: string[] = [];

    try {
      await upsertDreEntries(dreEntries);
    } catch (error) {
      errors.push(`DRE error: ${error.message}`);
    }

    try {
      await upsertCashflowEntries(cashflowEntries);
    } catch (error) {
      errors.push(`Cashflow error: ${error.message}`);
    }

    const dates = [...dreEntries.map((e) => e.date), ...cashflowEntries.map((e) => e.date)].sort();

    const result: UploadResult = {
      success: errors.length === 0,
      inserted: {
        dre: dreEntries.length,
        cashflow: cashflowEntries.length,
      },
      errors,
      summary: {
        companies: [cnpj],
        period: {
          from: dates[0] || 'N/A',
          to: dates[dates.length - 1] || 'N/A',
        },
      },
    };

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Upload DRE error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      }
    );
  }
});
