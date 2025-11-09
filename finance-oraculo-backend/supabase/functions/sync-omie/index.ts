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
  dData: string;
  cDescricao: string;
  nValor: number;
  cTipo: 'R' | 'D' | 'C' | 'O'; // Receita, Despesa, Custo, Outros
  cCategoria?: string;
}

interface OmieResponse {
  resultado: OmieTransaction[];
  nPagina: number;
  nTotPaginas: number;
}

async function fetchOmieData(
  appKey: string,
  appSecret: string,
  page: number = 1
): Promise<OmieResponse> {
  const response = await fetch(`${OMIE_API_BASE}geral/lancamentos/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      call: 'ListarLancamentos',
      app_key: appKey,
      app_secret: appSecret,
      param: [
        {
          nPagina: page,
          nRegPorPagina: 100,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OMIE API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

function mapOmieToDre(
  transaction: OmieTransaction,
  cnpj: string,
  nome?: string
): DreEntry | null {
  let nature: 'receita' | 'custo' | 'despesa' | 'outras';

  switch (transaction.cTipo) {
    case 'R':
      nature = 'receita';
      break;
    case 'C':
      nature = 'custo';
      break;
    case 'D':
      nature = 'despesa';
      break;
    case 'O':
      nature = 'outras';
      break;
    default:
      return null;
  }

  return {
    company_cnpj: cnpj,
    company_nome: nome,
    date: transaction.dData,
    account: transaction.cDescricao,
    nature,
    amount: transaction.nValor,
  };
}

function mapOmieToCashflow(
  transaction: OmieTransaction,
  cnpj: string,
  nome?: string
): CashflowEntry | null {
  const kind = transaction.nValor >= 0 ? 'in' : 'out';

  return {
    company_cnpj: cnpj,
    company_nome: nome,
    date: transaction.dData,
    kind,
    category: transaction.cCategoria || 'Sem categoria',
    amount: Math.abs(transaction.nValor),
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

  while (hasMore) {
    try {
      const response = await fetchOmieData(appKey, appSecret, currentPage);

      const dreEntries: DreEntry[] = [];
      const cashflowEntries: CashflowEntry[] = [];

      for (const transaction of response.resultado || []) {
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

      totalSynced += response.resultado?.length || 0;
      currentPage++;
      hasMore = currentPage <= response.nTotPaginas;

      await updateSyncState({
        source: 'OMIE',
        cnpj,
        cliente_nome: clienteNome,
        last_cursor: currentPage.toString(),
        last_success_at: new Date().toISOString(),
      });

      console.log(
        `Synced page ${currentPage - 1}/${response.nTotPaginas} for ${clienteNome}`
      );
    } catch (error) {
      console.error(`Error syncing OMIE for ${clienteNome}:`, error);
      hasMore = false;
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

    const results = [];

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
