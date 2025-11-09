import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs';
import { getSupabaseClient, onlyDigits, corsHeaders } from '../common/db.ts';

interface ExportParams {
  cnpj?: string;
  alias?: string;
  from?: string;
  to?: string;
}

async function getKPIDataByCnpj(cnpj: string, from: string, to: string) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_kpi_monthly_enriched')
    .select('*')
    .eq('company_cnpj', onlyDigits(cnpj))
    .gte('month', from)
    .lte('month', to)
    .order('month', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch KPI data: ${error.message}`);
  }

  return data || [];
}

async function getKPIDataByAlias(alias: string, from: string, to: string) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('fn_kpi_monthly_grouped', {
    group_name: alias,
    dt_from: from,
    dt_to: to,
  });

  if (error) {
    throw new Error(`Failed to fetch grouped KPI data: ${error.message}`);
  }

  return data || [];
}

async function getCashflowData(cnpj: string, from: string, to: string) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('cashflow_entries')
    .select('date, kind, category, amount')
    .eq('company_cnpj', onlyDigits(cnpj))
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch cashflow data: ${error.message}`);
  }

  return data || [];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const url = new URL(req.url);
    const cnpj = url.searchParams.get('cnpj');
    const alias = url.searchParams.get('alias');
    const from = url.searchParams.get('from') || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const to = url.searchParams.get('to') || new Date().toISOString().split('T')[0];

    if (!cnpj && !alias) {
      return new Response(
        JSON.stringify({ error: 'Either cnpj or alias parameter is required' }),
        {
          status: 400,
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
        }
      );
    }

    let kpiData;
    let reportTitle;

    if (alias) {
      kpiData = await getKPIDataByAlias(alias, from, to);
      reportTitle = `Relatório Consolidado - ${alias}`;
    } else {
      kpiData = await getKPIDataByCnpj(cnpj!, from, to);
      reportTitle = `Relatório Financeiro - ${cnpj}`;
    }

    if (kpiData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No data found for the specified period' }),
        {
          status: 404,
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
        }
      );
    }

    const workbook = XLSX.utils.book_new();

    const dreData = kpiData.map((row: any) => ({
      'Mês': row.month,
      'Receita': row.receita,
      'Custos': row.custos,
      'Despesas': row.despesas,
      'Outras': row.outras,
      'EBITDA': row.ebitda,
      'Margem Bruta': row.margem_bruta ? formatPercentage(row.margem_bruta) : 'N/A',
    }));

    const dreSheet = XLSX.utils.json_to_sheet(dreData);
    XLSX.utils.book_append_sheet(workbook, dreSheet, 'DRE Mensal');

    if (cnpj) {
      const cashflowData = await getCashflowData(cnpj, from, to);

      const cfGrouped = cashflowData.reduce((acc: any, row: any) => {
        const month = row.date.substring(0, 7);
        if (!acc[month]) {
          acc[month] = { month, entradas: 0, saidas: 0 };
        }
        if (row.kind === 'in') {
          acc[month].entradas += row.amount;
        } else {
          acc[month].saidas += row.amount;
        }
        return acc;
      }, {});

      const cfData = Object.values(cfGrouped).map((row: any) => ({
        'Mês': row.month,
        'Entradas': row.entradas,
        'Saídas': row.saidas,
        'Saldo': row.entradas - row.saidas,
      }));

      const cfSheet = XLSX.utils.json_to_sheet(cfData);
      XLSX.utils.book_append_sheet(workbook, cfSheet, 'Fluxo de Caixa');
    }

    const summaryData = [
      { 'Métrica': 'Período', 'Valor': `${from} a ${to}` },
      { 'Métrica': 'Total de Meses', 'Valor': kpiData.length },
      {
        'Métrica': 'Receita Total',
        'Valor': formatCurrency(kpiData.reduce((sum: number, row: any) => sum + row.receita, 0)),
      },
      {
        'Métrica': 'EBITDA Médio',
        'Valor': formatCurrency(kpiData.reduce((sum: number, row: any) => sum + row.ebitda, 0) / kpiData.length),
      },
      {
        'Métrica': 'Margem Bruta Média',
        'Valor': formatPercentage(
          kpiData.reduce((sum: number, row: any) => sum + (row.margem_bruta || 0), 0) / kpiData.length
        ),
      },
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new Response(excelBuffer, {
      headers: {
        ...corsHeaders(),
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export Excel error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      }
    );
  }
});
