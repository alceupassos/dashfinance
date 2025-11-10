import { DreEntry, CashflowEntry, upsertDreEntries, upsertCashflowEntries, updateSyncState, onlyDigits } from './db.ts';

const F360_API_BASE = Deno.env.get('F360_API_BASE') || 'https://app.f360.com.br/api';

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

async function fetchF360Data(token: string, cursor?: string): Promise<F360Response> {
  const url = new URL(`${F360_API_BASE}/transactions`);
  if (cursor) {
    url.searchParams.set('cursor', cursor);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`F360 API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
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
  let cursor: string | undefined | null = undefined;
  let hasMore = true;
  let totalSynced = 0;

  while (hasMore) {
    const response = await fetchF360Data(token, cursor);

    const dreEntries: DreEntry[] = [];
    const cashflowEntries: CashflowEntry[] = [];

    for (const transaction of response.data || []) {
      const normalizedCnpj =
        onlyDigits(transaction.cnpj || transaction.empresa_id || '') ||
        onlyDigits(companies[0]?.cnpj || '');

      const company = companyLookup.get(normalizedCnpj) || companies[0];
      const targetCnpj = onlyDigits(company?.cnpj || normalizedCnpj);
      const targetName = company?.cliente_nome;

      const dreEntry = mapF360ToDre(transaction, targetCnpj, targetName);
      if (dreEntry) {
        dreEntries.push(dreEntry);
      }

      const cfEntry = mapF360ToCashflow(transaction, targetCnpj, targetName);
      if (cfEntry) {
        cashflowEntries.push(cfEntry);
      }

      const prevCount = companyCounts.get(targetCnpj) || 0;
      companyCounts.set(targetCnpj, prevCount + 1);
      totalSynced += 1;
    }

    if (dreEntries.length > 0) {
      await upsertDreEntries(dreEntries);
    }

    if (cashflowEntries.length > 0) {
      await upsertCashflowEntries(cashflowEntries);
    }

    cursor = response.next_cursor;
    hasMore = !!cursor;
  }

  for (const company of companies) {
    await updateSyncState({
      source: 'F360',
      cnpj: onlyDigits(company.cnpj),
      cliente_nome: company.cliente_nome,
      last_cursor: cursor || null,
      last_success_at: new Date().toISOString(),
    });
  }

  return {
    totalSynced,
    countsByCnpj: companyCounts,
    lastCursor: cursor ?? null,
  };
}
