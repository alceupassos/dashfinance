import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  getSupabaseClient,
  upsertDreEntries,
  upsertCashflowEntries,
  updateSyncState,
  getSyncState,
  onlyDigits,
  corsHeaders,
  DreEntry,
  CashflowEntry,
} from '../common/db.ts';

const OMIE_API_BASE = Deno.env.get('OMIE_API_BASE') || 'https://app.omie.com.br/api/v1/';

interface OmieTransaction {
  dDtMovimento?: string;
  dData?: string;
  cDescricaoMovimento?: string;
  cDescricao?: string;
  nValorLancamento?: number;
  nValor?: number;
  cNatureza?: 'C' | 'D';
  cTipo?: 'R' | 'D' | 'C' | 'O'; // Receita, Despesa, Custo, Outros
  cCategoria?: string;
  cCodigoContaCorrente?: string;
}

interface OmieResponse {
  movimentos?: OmieTransaction[];
  resultado?: OmieTransaction[];
  movimentacoes?: OmieTransaction[];
  movimentoContaCorrente?: OmieTransaction[];
  lista?: OmieTransaction[];
  cabecalho?: {
    total_de_paginas?: number;
    pagina?: number;
    pagina_atual?: number;
  };
  nPagina?: number;
  nTotPaginas?: number;
  total_de_paginas?: number;
  total_paginas?: number;
}

type OmieAccount = {
  cCodigo?: string;
  cCodigoContaCorrente?: string;
  codigo?: string;
  descricao?: string;
};

function ensureArray<T = unknown>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function formatOmieDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function fetchOmieAccounts(appKey: string, appSecret: string): Promise<OmieAccount[]> {
  try {
    const response = await fetch(`${OMIE_API_BASE}financas/contacorrente/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        call: 'ListarContasCorrentes',
        app_key: appKey,
        app_secret: appSecret,
        param: [
          {
            pagina: 1,
            registros_por_pagina: 200,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error(`OMIE ListarContasCorrentes error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    const registros = [
      ...ensureArray(data?.conta_corrente_cadastro),
      ...ensureArray(data?.contas_correntes),
      ...ensureArray(data?.listagem),
    ].filter(Boolean) as OmieAccount[];

    return registros;
  } catch (error) {
    console.error('OMIE ListarContasCorrentes exception:', error);
    return [];
  }
}

async function fetchOmieData(
  appKey: string,
  appSecret: string,
  accountCode: string,
  dateStart: string,
  dateEnd: string,
  page: number = 1
): Promise<OmieResponse> {
  const response = await fetch(`${OMIE_API_BASE}financas/contacorrente/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      call: 'ListarMovimentos',
      app_key: appKey,
      app_secret: appSecret,
      param: [
        {
          cCodigoContaCorrente: accountCode,
          dDataMovimentoInicial: dateStart,
          dDataMovimentoFinal: dateEnd,
          nPagina: page,
          nRegPorPagina: 100,
          lRetornarSaldoPeriodo: 'N',
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`OMIE API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return await response.json();
}

function mapOmieToDre(
  transaction: OmieTransaction,
  cnpj: string,
  nome?: string
): DreEntry | null {
  let nature: 'receita' | 'custo' | 'despesa' | 'outras';
  const tipo = transaction.cTipo ?? transaction.cNatureza;

  if (tipo === 'R') {
    nature = 'receita';
  } else if (tipo === 'C' && transaction.cTipo === 'C') {
    nature = 'custo';
  } else if (tipo === 'D' && transaction.cTipo === 'D') {
    nature = 'despesa';
  } else if (tipo === 'O') {
    nature = 'outras';
  } else {
    if (tipo === 'C') {
      nature = 'receita';
    } else if (tipo === 'D') {
      nature = 'despesa';
    } else {
      // Fallback baseado no sinal do valor
      const rawAmount = transaction.nValorLancamento ?? transaction.nValor ?? 0;
      nature = rawAmount >= 0 ? 'receita' : 'despesa';
    }
  }

  const date = transaction.dDtMovimento ?? transaction.dData;
  const description = transaction.cDescricaoMovimento ?? transaction.cDescricao;
  const rawAmount = transaction.nValorLancamento ?? transaction.nValor ?? 0;

  return {
    company_cnpj: cnpj,
    company_nome: nome,
    date: date ?? new Date().toISOString().split('T')[0],
    account: description ?? 'Sem descrição',
    nature,
    amount: Math.abs(rawAmount),
  };
}

function mapOmieToCashflow(
  transaction: OmieTransaction,
  cnpj: string,
  nome?: string
): CashflowEntry | null {
  const rawAmount = transaction.nValorLancamento ?? transaction.nValor ?? 0;
  const kind = rawAmount >= 0 ? 'in' : 'out';
  const date = transaction.dDtMovimento ?? transaction.dData;
  const description = transaction.cDescricaoMovimento ?? transaction.cDescricao;

  return {
    company_cnpj: cnpj,
    company_nome: nome,
    date: date ?? new Date().toISOString().split('T')[0],
    kind,
    category: transaction.cCategoria || 'Sem categoria',
    amount: Math.abs(rawAmount),
  };
}

async function syncOmieIntegration(
  id: string,
  clienteNome: string,
  appKey: string,
  appSecret: string
) {
  console.log(`Starting OMIE sync for ${clienteNome}`);

  const supabase = getSupabaseClient();

  const { data: cliente } = await supabase
    .from('clientes')
    .select('cnpj')
    .eq('nome_interno_cliente', clienteNome)
    .single();

  const cnpj = cliente?.cnpj ? onlyDigits(cliente.cnpj) : 'UNKNOWN';

  const syncState = await getSyncState('OMIE', undefined, clienteNome);
  let currentPage = syncState?.last_cursor ? parseInt(syncState.last_cursor) : 1;

  let hasMore = true;
  let totalSynced = 0;
  const accounts = await fetchOmieAccounts(appKey, appSecret);

  if (accounts.length === 0) {
    console.warn(`Nenhuma conta Omie encontrada para ${clienteNome}`);
    return 0;
  }

  const dateEnd = new Date();
  const dateStart = new Date();
  dateStart.setFullYear(dateEnd.getFullYear() - 1);

  const formattedStart = formatOmieDate(dateStart);
  const formattedEnd = formatOmieDate(dateEnd);

  for (const account of accounts) {
    const accountCode =
      account.cCodigoContaCorrente ??
      account.cCodigo ??
      account.codigo ??
      null;

    if (!accountCode) {
      continue;
    }

    currentPage = syncState?.last_cursor ? parseInt(syncState.last_cursor) : 1;
    hasMore = true;

    while (hasMore) {
      try {
        const response = await fetchOmieData(
          appKey,
          appSecret,
          accountCode,
          formattedStart,
          formattedEnd,
          currentPage
        );

        const movimentos = [
          ...ensureArray(response.movimentos),
          ...ensureArray(response.movimentoContaCorrente),
          ...ensureArray(response.lista),
          ...ensureArray(response.resultado),
        ].filter(Boolean) as OmieTransaction[];

        const dreEntries: DreEntry[] = [];
        const cashflowEntries: CashflowEntry[] = [];

        for (const transaction of movimentos || []) {
          const dreEntry = mapOmieToDre(transaction, cnpj, clienteNome);
          if (dreEntry) {
            dreEntries.push(dreEntry);
          }

          const cfEntry = mapOmieToCashflow(transaction, cnpj, clienteNome);
          if (cfEntry) {
            cashflowEntries.push(cfEntry);
          }
        }

        if (dreEntries.length > 0) {
          await upsertDreEntries(dreEntries);
        }

        if (cashflowEntries.length > 0) {
          await upsertCashflowEntries(cashflowEntries);
        }

        totalSynced += movimentos?.length || 0;
        currentPage++;

        const totalPages =
          response.total_de_paginas ??
          response.total_paginas ??
          response.nTotPaginas ??
          response.cabecalho?.total_de_paginas ??
          0;

        hasMore = totalPages ? currentPage <= totalPages : movimentos.length > 0;

        await updateSyncState({
          source: 'OMIE',
          cnpj,
          cliente_nome: clienteNome,
          last_cursor: currentPage.toString(),
          last_success_at: new Date().toISOString(),
        });

        console.log(
          `Synced page ${currentPage - 1}/${totalPages || '?'} for ${clienteNome} (conta ${accountCode})`
        );
      } catch (error) {
        console.error(`Error syncing OMIE for ${clienteNome} (conta ${accountCode}):`, error);
        hasMore = false;
      }
    }
  }

  return totalSynced;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const supabase = getSupabaseClient();

    const { data: integrations, error } = await supabase
      .from('integration_omie')
      .select('*');

    if (error) {
      throw error;
    }

    const results: Array<{ cliente: string; synced: number }> = [];

    for (const integration of integrations || []) {
      const { data: keysData, error: decryptError } = await supabase.rpc(
        'decrypt_omie_keys',
        {
          _id: integration.id,
        }
      );

      if (decryptError || !keysData) {
        console.error(`Failed to decrypt keys for ${integration.cliente_nome}`);
        continue;
      }

      const count = await syncOmieIntegration(
        integration.id,
        integration.cliente_nome,
        keysData.app_key,
        keysData.app_secret
      );

      results.push({
        cliente: integration.cliente_nome,
        synced: count,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Sync OMIE error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }
});
