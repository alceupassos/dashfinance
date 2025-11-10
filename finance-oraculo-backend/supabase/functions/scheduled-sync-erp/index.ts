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
import { syncF360TokenGroup, F360Company } from '../common/f360-sync.ts';

const OMIE_API_BASE = Deno.env.get('OMIE_API_BASE') || 'https://app.omie.com.br/api/v1';

// ========================================
// TIPOS OMIE
// ========================================
interface OmieTransaction {
  dDtEmissao: string;
  nValorLiquido: number;
  cTipo: string;
  cCategoria: string;
  cDescricao?: string;
}

interface OmieResponse {
  resultado?: OmieTransaction[];
  nTotPaginas: number;
  nPagina: number;
}
async function fetchOmieData(appKey: string, appSecret: string, page: number): Promise<OmieResponse> {
  // Buscar dados dos últimos 90 dias
  const dataInicio = new Date();
  dataInicio.setDate(dataInicio.getDate() - 90);

  const body = {
    call: 'ListarLancamentos',
    app_key: appKey,
    app_secret: appSecret,
    param: [{
      nPagina: page,
      nRegPorPagina: 100,
      dDtEmissaoDe: dataInicio.toISOString().split('T')[0],
    }],
  };

  const response = await fetch(`${OMIE_API_BASE}/financas/contacorrente/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`OMIE API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

function mapOmieToDre(transaction: OmieTransaction, cnpj: string, nome?: string): DreEntry | null {
  let nature: 'receita' | 'custo' | 'despesa' | 'outras';

  const tipo = transaction.cTipo?.toLowerCase() || '';
  
  if (tipo.includes('receita') || tipo.includes('recebimento')) {
    nature = 'receita';
  } else if (tipo.includes('custo')) {
    nature = 'custo';
  } else if (tipo.includes('despesa') || tipo.includes('pagamento')) {
    nature = 'despesa';
  } else {
    nature = 'outras';
  }

  return {
    company_cnpj: cnpj,
    company_nome: nome,
    date: transaction.dDtEmissao,
    account: transaction.cCategoria || 'Sem categoria',
    nature,
    amount: Math.abs(transaction.nValorLiquido),
  };
}

function mapOmieToCashflow(transaction: OmieTransaction, cnpj: string, nome?: string): CashflowEntry | null {
  const kind = transaction.nValorLiquido >= 0 ? 'in' : 'out';

  return {
    company_cnpj: cnpj,
    company_nome: nome,
    date: transaction.dDtEmissao,
    kind,
    category: transaction.cCategoria || 'Sem categoria',
    amount: Math.abs(transaction.nValorLiquido),
  };
}

async function syncOmieIntegration(
  id: string,
  clienteNome: string,
  appKey: string,
  appSecret: string
) {
  console.log(`[OMIE] Starting sync for ${clienteNome}`);

  const supabase = getSupabaseClient();

  // Buscar CNPJ do cliente
  const { data: cliente } = await supabase
    .from('clients')
    .select('cnpj')
    .ilike('razao_social', `%${clienteNome}%`)
    .limit(1)
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

      console.log(`[OMIE] Synced page ${currentPage - 1}/${response.nTotPaginas} for ${clienteNome}`);
    } catch (error) {
      console.error(`[OMIE] Error syncing ${clienteNome}:`, error);
      hasMore = false;
    }
  }

  return totalSynced;
}

// ========================================
// HANDLER PRINCIPAL
// ========================================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const supabase = getSupabaseClient();
    const results = {
      f360: [] as any[],
      omie: [] as any[],
      timestamp: new Date().toISOString(),
    };

    console.log('Starting scheduled ERP sync...');

    // Sincronizar F360
    const { data: f360Integrations, error: f360Error } = await supabase
      .from('integration_f360')
      .select('id, cliente_nome, cnpj, token_enc');

    if (f360Error) {
      console.error('Error fetching F360 integrations:', f360Error);
    } else {
      const tokenGroups = new Map<string, { token: string; companies: F360Company[] }>();

      for (const integration of f360Integrations || []) {
        if (!integration.cnpj) {
          results.f360.push({
            cliente: integration.cliente_nome,
            cnpj: integration.cnpj || 'missing',
            status: 'error',
            error: 'cnpj vazio',
          });
          continue;
        }

        const tokenKey = String(integration.token_enc ?? integration.id);
        let group = tokenGroups.get(tokenKey);

        if (!group) {
          const { data: tokenData, error: decryptError } = await supabase.rpc('decrypt_f360_token', {
            _id: integration.id,
          });

          if (decryptError || !tokenData) {
            console.error(`Failed to decrypt token for ${integration.cliente_nome}`);
            results.f360.push({
              cliente: integration.cliente_nome,
              cnpj: integration.cnpj,
              status: 'error',
              error: 'Failed to decrypt token',
            });
            continue;
          }

          group = { token: tokenData, companies: [] };
          tokenGroups.set(tokenKey, group);
        }

        group.companies.push({
          id: integration.id,
          cliente_nome: integration.cliente_nome,
          cnpj: integration.cnpj,
        });
      }

      for (const group of tokenGroups.values()) {
        try {
          const summary = await syncF360TokenGroup(group.token, group.companies);

          for (const company of group.companies) {
            const normalized = onlyDigits(company.cnpj);
            results.f360.push({
              cliente: company.cliente_nome,
              cnpj: company.cnpj,
              synced: summary.countsByCnpj.get(normalized) ?? 0,
              status: 'success',
              token_shared: group.companies.length > 1,
            });
          }
        } catch (error) {
          console.error('Error syncing token group:', error);
          for (const company of group.companies) {
            results.f360.push({
              cliente: company.cliente_nome,
              cnpj: company.cnpj,
              status: 'error',
              error: (error as Error).message || 'Erro desconhecido',
            });
          }
        }
      }
    }

    // Sincronizar OMIE
    const { data: omieIntegrations, error: omieError } = await supabase
      .from('integration_omie')
      .select('*');

    if (omieError) {
      console.error('Error fetching OMIE integrations:', omieError);
    } else {
      for (const integration of omieIntegrations || []) {
        try {
          const { data: keysData, error: decryptError } = await supabase.rpc(
            'decrypt_omie_keys',
            {
              _id: integration.id,
            }
          );

          if (decryptError || !keysData) {
            console.error(`Failed to decrypt keys for ${integration.cliente_nome}`);
            results.omie.push({
              cliente: integration.cliente_nome,
              status: 'error',
              error: 'Failed to decrypt keys',
            });
            continue;
          }

          const count = await syncOmieIntegration(
            integration.id,
            integration.cliente_nome,
            keysData.app_key,
            keysData.app_secret
          );

          results.omie.push({
            cliente: integration.cliente_nome,
            synced: count,
            status: 'success',
          });
        } catch (error) {
          console.error(`Error syncing OMIE ${integration.cliente_nome}:`, error);
          results.omie.push({
            cliente: integration.cliente_nome,
            status: 'error',
            error: error.message,
          });
        }
      }
    }

    console.log('Scheduled ERP sync completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      {
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Scheduled sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      }
    );
  }
});
