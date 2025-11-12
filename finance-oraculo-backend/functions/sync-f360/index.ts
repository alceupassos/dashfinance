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

const F360_API_BASE = Deno.env.get('F360_API_BASE') || 'https://api.f360.com.br/v1';

interface F360Transaction {
  date: string;
  account: string;
  amount: number;
  type: 'revenue' | 'expense' | 'cost' | 'other';
  category?: string;
}

interface F360Response {
  data: F360Transaction[];
  next_cursor?: string;
}

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

  switch (transaction.type) {
    case 'revenue':
      nature = 'receita';
      break;
    case 'cost':
      nature = 'custo';
      break;
    case 'expense':
      nature = 'despesa';
      break;
    case 'other':
      nature = 'outras';
      break;
    default:
      return null;
  }

  return {
    company_cnpj: cnpj,
    company_nome: nome,
    date: transaction.date,
    account: transaction.account,
    nature,
    amount: transaction.amount,
  };
}

function mapF360ToCashflow(transaction: F360Transaction, cnpj: string, nome?: string): CashflowEntry | null {
  const kind = transaction.amount >= 0 ? 'in' : 'out';

  return {
    company_cnpj: cnpj,
    company_nome: nome,
    date: transaction.date,
    kind,
    category: transaction.category || 'Sem categoria',
    amount: Math.abs(transaction.amount),
  };
}

async function syncF360Integration(id: string, clienteNome: string, cnpj: string, token: string) {
  console.log(`Starting F360 sync for ${clienteNome} (${cnpj})`);

  const cleanCnpj = onlyDigits(cnpj);
  const syncState = await getSyncState('F360', cleanCnpj, clienteNome);
  let cursor = syncState?.last_cursor;

  let hasMore = true;
  let totalSynced = 0;

  while (hasMore) {
    try {
      const response = await fetchF360Data(token, cursor);

      const dreEntries: DreEntry[] = [];
      const cashflowEntries: CashflowEntry[] = [];

      for (const transaction of response.data) {
        const dreEntry = mapF360ToDre(transaction, cleanCnpj, clienteNome);
        if (dreEntry) {
          dreEntries.push(dreEntry);
        }

        const cfEntry = mapF360ToCashflow(transaction, cleanCnpj, clienteNome);
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

      await updateSyncState({
        source: 'F360',
        cnpj: cleanCnpj,
        cliente_nome: clienteNome,
        last_cursor: cursor,
        last_success_at: new Date().toISOString(),
      });

      console.log(`Synced ${totalSynced} transactions for ${clienteNome}`);
    } catch (error) {
      console.error(`Error syncing F360 for ${clienteNome}:`, error);
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
      .from('integration_f360')
      .select('*');

    if (error) {
      throw error;
    }

    const results = [];

    for (const integration of integrations || []) {
      const { data: tokenData, error: decryptError } = await supabase.rpc('decrypt_f360_token', {
        _id: integration.id,
      });

      if (decryptError || !tokenData) {
        console.error(`Failed to decrypt token for ${integration.cliente_nome}`);
        continue;
      }

      const count = await syncF360Integration(
        integration.id,
        integration.cliente_nome,
        integration.cnpj,
        tokenData
      );

      results.push({
        cliente: integration.cliente_nome,
        cnpj: integration.cnpj,
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
    console.error('Sync F360 error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      }
    );
  }
});
