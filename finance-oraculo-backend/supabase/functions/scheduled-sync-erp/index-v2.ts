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
} from './common/db.ts';

const F360_API_BASE = Deno.env.get('F360_API_BASE') || 'https://api.f360.com.br/v1';
const OMIE_API_BASE = Deno.env.get('OMIE_API_BASE') || 'https://app.omie.com.br/api/v1/';

// ========================================
// TIPOS F360
// ========================================
interface F360Transaction {
  cnpj?: string; // CNPJ vem da API para identificar a empresa
  empresa_id?: string;
  empresa_nome?: string;
  data_vencimento: string;
  valor: number;
  tipo: 'receita' | 'despesa' | 'custo';
  categoria: string;
  descricao?: string;
  data_pagamento?: string;
}

interface F360Response {
  data: F360Transaction[];
  next_cursor?: string;
}

interface F360IntegrationGroup {
  token: string;
  empresas: Array<{
    id: string;
    cnpj: string;
    nome: string;
    grupo?: string;
  }>;
}

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

// ========================================
// FUNÇÕES F360
// ========================================
async function fetchF360Data(token: string, cursor?: string): Promise<F360Response> {
  // Usar endpoint de DRE (endpoint correto da API F360)
  const url = new URL(`${F360_API_BASE}/reports/dre`);
  
  // Buscar dados dos últimos 90 dias
  const dataInicio = new Date();
  dataInicio.setDate(dataInicio.getDate() - 90);
  const dataFim = new Date();
  
  url.searchParams.set('date_start', dataInicio.toISOString().split('T')[0]);
  url.searchParams.set('date_end', dataFim.toISOString().split('T')[0]);
  
  if (cursor) {
    url.searchParams.set('cursor', cursor);
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
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

  if (transaction.tipo === 'receita') {
    nature = 'receita';
  } else if (transaction.tipo === 'custo') {
    nature = 'custo';
  } else if (transaction.tipo === 'despesa') {
    nature = 'despesa';
  } else {
    nature = 'outras';
  }

  return {
    company_cnpj: cnpj,
    company_nome: nome,
    date: transaction.data_vencimento,
    account: transaction.categoria || 'Sem categoria',
    nature,
    amount: Math.abs(transaction.valor),
  };
}

function mapF360ToCashflow(transaction: F360Transaction, cnpj: string, nome?: string): CashflowEntry | null {
  // Só considera se tiver data de pagamento
  if (!transaction.data_pagamento) {
    return null;
  }

  const kind = transaction.tipo === 'receita' ? 'in' : 'out';

  return {
    company_cnpj: cnpj,
    company_nome: nome,
    date: transaction.data_pagamento,
    kind,
    category: transaction.categoria || 'Sem categoria',
    amount: Math.abs(transaction.valor),
  };
}

// ========================================
// SINCRONIZAÇÃO F360 COM SUPORTE A GRUPOS
// ========================================
async function syncF360TokenGroup(group: F360IntegrationGroup) {
  console.log(`[F360] Starting sync for token with ${group.empresas.length} empresa(s)`);

  // Usar CNPJ da empresa principal ou primeira empresa para sync_state
  const empresaPrincipal = group.empresas[0];
  const syncState = await getSyncState('F360', empresaPrincipal.cnpj, empresaPrincipal.nome);
  let cursor = syncState?.last_cursor;

  let hasMore = true;
  let totalSynced = 0;
  const empresasMap = new Map(group.empresas.map(e => [onlyDigits(e.cnpj), e]));

  while (hasMore) {
    try {
      const response = await fetchF360Data(group.token, cursor);

      const dreEntries: DreEntry[] = [];
      const cashflowEntries: CashflowEntry[] = [];

      for (const transaction of response.data) {
        // CRÍTICO: Usar CNPJ que vem da transação, não da integração!
        let cnpjTransacao = transaction.cnpj ? onlyDigits(transaction.cnpj) : null;
        
        // Se não vier CNPJ na transação, tentar identificar pela empresa_id ou usar primeira empresa
        if (!cnpjTransacao && group.empresas.length === 1) {
          cnpjTransacao = group.empresas[0].cnpj;
        }

        if (!cnpjTransacao) {
          console.warn('[F360] Transaction without CNPJ, skipping:', transaction);
          continue;
        }

        // Buscar informações da empresa
        const empresa = empresasMap.get(cnpjTransacao);
        const nomeEmpresa = empresa?.nome || transaction.empresa_nome || 'Desconhecido';

        const dreEntry = mapF360ToDre(transaction, cnpjTransacao, nomeEmpresa);
        if (dreEntry) {
          dreEntries.push(dreEntry);
        }

        const cfEntry = mapF360ToCashflow(transaction, cnpjTransacao, nomeEmpresa);
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

      totalSynced += response.data.length;
      cursor = response.next_cursor;
      hasMore = !!cursor;

      // Atualizar sync_state para cada empresa do grupo
      for (const empresa of group.empresas) {
        await updateSyncState({
          source: 'F360',
          cnpj: empresa.cnpj,
          cliente_nome: empresa.nome,
          last_cursor: cursor,
          last_success_at: new Date().toISOString(),
        });
      }

      console.log(`[F360] Synced ${totalSynced} transactions for group`);
    } catch (error) {
      console.error(`[F360] Error syncing group:`, error);
      hasMore = false;
    }
  }

  return totalSynced;
}

// ========================================
// FUNÇÕES OMIE
// ========================================
async function fetchOmieData(appKey: string, appSecret: string, page: number): Promise<OmieResponse> {
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

    // ========================================
    // SINCRONIZAR F360 COM AGRUPAMENTO POR TOKEN
    // ========================================
    const { data: f360Integrations, error: f360Error } = await supabase
      .from('integration_f360')
      .select('*')
      .order('grupo_empresarial', { ascending: true, nullsFirst: false });

    if (f360Error) {
      console.error('Error fetching F360 integrations:', f360Error);
    } else {
      // Agrupar integrações por token
      const tokenGroups = new Map<string, F360IntegrationGroup>();

      for (const integration of f360Integrations || []) {
        try {
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

          // Agrupar por token
          if (!tokenGroups.has(tokenData)) {
            tokenGroups.set(tokenData, {
              token: tokenData,
              empresas: [],
            });
          }

          tokenGroups.get(tokenData)!.empresas.push({
            id: integration.id,
            cnpj: onlyDigits(integration.cnpj),
            nome: integration.cliente_nome,
            grupo: integration.grupo_empresarial,
          });
        } catch (error) {
          console.error(`Error processing integration ${integration.cliente_nome}:`, error);
        }
      }

      console.log(`[F360] Found ${tokenGroups.size} unique token(s) for ${f360Integrations?.length || 0} empresa(s)`);

      // Processar cada grupo de token
      for (const [token, group] of tokenGroups) {
        try {
          const count = await syncF360TokenGroup(group);

          for (const empresa of group.empresas) {
            results.f360.push({
              cliente: empresa.nome,
              cnpj: empresa.cnpj,
              grupo: empresa.grupo || 'individual',
              synced: count,
              status: 'success',
              shared_token: group.empresas.length > 1,
            });
          }
        } catch (error) {
          console.error(`Error syncing F360 token group:`, error);
          for (const empresa of group.empresas) {
            results.f360.push({
              cliente: empresa.nome,
              cnpj: empresa.cnpj,
              status: 'error',
              error: error.message,
            });
          }
        }
      }
    }

    // ========================================
    // SINCRONIZAR OMIE (sem mudanças)
    // ========================================
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

