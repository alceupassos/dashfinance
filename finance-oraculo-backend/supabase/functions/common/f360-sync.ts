import { DreEntry, CashflowEntry, upsertDreEntries, upsertCashflowEntries, updateSyncState, onlyDigits } from './db.ts';

const F360_API_BASE = Deno.env.get('F360_API_BASE') || 'https://api.f360.com.br/v1';

interface F360Transaction {
  cnpj?: string;
  empresa_id?: string;
  date?: string;
  data_vencimento?: string;
  data_pagamento?: string;
  account?: string;
  categoria?: string;
  amount: number;
  type?: 'revenue' | 'expense' | 'cost' | 'other' | string;
  tipo?: string;
  category?: string;
  description?: string;
}

interface F360Response {
  data: F360Transaction[];
  next_cursor?: string;
}

export interface F360Company {
  id: string;
  cliente_nome: string;
  cnpj: string;
}

export interface SyncGroupSummary {
  totalSynced: number;
  countsByCnpj: Map<string, number>;
  lastCursor?: string | null;
}

async function fetchF360DRE(token: string, dateStart: string, dateEnd: string): Promise<F360Response> {
  const url = new URL(`${F360_API_BASE}/reports/dre`);
  url.searchParams.set('date_start', dateStart);
  url.searchParams.set('date_end', dateEnd);
  
  console.log(`[F360 Sync] Fetching DRE from: ${url.toString()}`);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`F360 API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  
  // Normalizar resposta
  if (data.resultado && Array.isArray(data.resultado)) {
    return { data: data.resultado, next_cursor: data.next_cursor };
  }
  if (data.data && Array.isArray(data.data)) {
    return { data: data.data, next_cursor: data.next_cursor };
  }
  if (Array.isArray(data)) {
    return { data, next_cursor: null };
  }
  
  return { data: [], next_cursor: null };
}

async function fetchF360Cashflow(token: string, dateStart: string, dateEnd: string): Promise<F360Response> {
  const url = new URL(`${F360_API_BASE}/financial/cashflow`);
  url.searchParams.set('date_start', dateStart);
  url.searchParams.set('date_end', dateEnd);
  
  console.log(`[F360 Sync] Fetching Cashflow from: ${url.toString()}`);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`F360 API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  
  // Normalizar resposta
  if (data.resultado && Array.isArray(data.resultado)) {
    return { data: data.resultado, next_cursor: data.next_cursor };
  }
  if (data.data && Array.isArray(data.data)) {
    return { data: data.data, next_cursor: data.next_cursor };
  }
  if (Array.isArray(data)) {
    return { data, next_cursor: null };
  }
  
  return { data: [], next_cursor: null };
}

function mapF360ToDre(transaction: F360Transaction, cnpj: string, nome?: string): DreEntry | null {
  let nature: 'receita' | 'custo' | 'despesa' | 'outras';
  const tipo = (transaction.type ?? transaction.tipo ?? '').toString().toLowerCase();
  const transactionDate =
    transaction.date || transaction.data_vencimento || transaction.data_pagamento || new Date().toISOString().split('T')[0];
  const account = transaction.account || transaction.category || transaction.categoria || 'Sem categoria';

  if (tipo.includes('revenue') || tipo.includes('receita') || tipo.includes('entrada')) {
    nature = 'receita';
  } else if (tipo.includes('cost') || tipo.includes('custo')) {
    nature = 'custo';
  } else if (tipo.includes('expense') || tipo.includes('despesa') || tipo.includes('pagamento')) {
    nature = 'despesa';
  } else {
    nature = 'outras';
  }

  return {
    company_cnpj: cnpj,
    company_nome: nome,
    date: transactionDate,
    account,
    nature,
    amount: Math.abs(transaction.amount),
  };
}

function mapF360ToCashflow(transaction: F360Transaction, cnpj: string, nome?: string): CashflowEntry | null {
  if (transaction.amount === undefined || transaction.amount === null) {
    return null;
  }

  const tipo = (transaction.tipo ?? transaction.type ?? '').toString().toLowerCase();
  const kind =
    tipo.includes('receita') || tipo.includes('revenue') || transaction.amount >= 0 ? 'in' : 'out';
  const transactionDate =
    transaction.data_pagamento ??
    transaction.date ??
    transaction.data_vencimento ??
    new Date().toISOString().split('T')[0];
  const category = transaction.category || transaction.account || transaction.categoria || 'Sem categoria';

  return {
    company_cnpj: cnpj,
    company_nome: nome,
    date: transactionDate,
    kind,
    category,
    amount: Math.abs(transaction.amount),
  };
}

export async function syncF360TokenGroup(token: string, companies: F360Company[]): Promise<SyncGroupSummary> {
  const companyLookup = new Map<string, F360Company>();
  for (const company of companies) {
    const normalized = onlyDigits(company.cnpj);
    companyLookup.set(normalized, company);
  }

  const companyCounts = new Map<string, number>();
  let totalSynced = 0;

  // Buscar dados dos últimos 90 dias
  const dateEnd = new Date();
  const dateStart = new Date();
  dateStart.setDate(dateStart.getDate() - 90);
  
  const dateStartStr = dateStart.toISOString().split('T')[0];
  const dateEndStr = dateEnd.toISOString().split('T')[0];

  // Buscar DRE
  try {
    const dreResponse = await fetchF360DRE(token, dateStartStr, dateEndStr);
    const dreEntries: DreEntry[] = [];

    for (const item of dreResponse.data || []) {
      const normalizedCnpj =
        onlyDigits(item.cnpj || item.empresa_id || '') ||
        onlyDigits(companies[0]?.cnpj || '');

      const company = companyLookup.get(normalizedCnpj) || companies[0];
      const targetCnpj = onlyDigits(company?.cnpj || normalizedCnpj);
      const targetName = company?.cliente_nome;

      const dreEntry = mapF360ToDre(item, targetCnpj, targetName);
      if (dreEntry) {
        dreEntries.push(dreEntry);
        const prevCount = companyCounts.get(targetCnpj) || 0;
        companyCounts.set(targetCnpj, prevCount + 1);
        totalSynced += 1;
      }
    }

    if (dreEntries.length > 0) {
      await upsertDreEntries(dreEntries);
      console.log(`[F360 Sync] Inserted ${dreEntries.length} DRE entries`);
    }
  } catch (error) {
    console.error(`[F360 Sync] Error fetching DRE:`, error);
  }

  // Buscar Cashflow
  try {
    const cfResponse = await fetchF360Cashflow(token, dateStartStr, dateEndStr);
    const cashflowEntries: CashflowEntry[] = [];

    for (const item of cfResponse.data || []) {
      const normalizedCnpj =
        onlyDigits(item.cnpj || item.empresa_id || '') ||
        onlyDigits(companies[0]?.cnpj || '');

      const company = companyLookup.get(normalizedCnpj) || companies[0];
      const targetCnpj = onlyDigits(company?.cnpj || normalizedCnpj);
      const targetName = company?.cliente_nome;

      const cfEntry = mapF360ToCashflow(item, targetCnpj, targetName);
      if (cfEntry) {
        cashflowEntries.push(cfEntry);
      }
    }

    if (cashflowEntries.length > 0) {
      await upsertCashflowEntries(cashflowEntries);
      console.log(`[F360 Sync] Inserted ${cashflowEntries.length} cashflow entries`);
    }
  } catch (error) {
    console.error(`[F360 Sync] Error fetching cashflow:`, error);
  }

  for (const company of companies) {
    await updateSyncState({
      source: 'F360',
      cnpj: onlyDigits(company.cnpj),
      cliente_nome: company.cliente_nome,
      last_cursor: null,
      last_success_at: new Date().toISOString(),
    });
  }

  return {
    totalSynced,
    countsByCnpj: companyCounts,
    lastCursor: null,
  };
}
