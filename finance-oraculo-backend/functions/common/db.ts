import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface DreEntry {
  company_cnpj: string;
  company_nome?: string;
  date: string;
  account: string;
  nature: 'receita' | 'custo' | 'despesa' | 'outras';
  amount: number;
}

export interface CashflowEntry {
  company_cnpj: string;
  company_nome?: string;
  date: string;
  kind: 'in' | 'out';
  category?: string;
  amount: number;
}

export interface SyncState {
  source: 'F360' | 'OMIE';
  cnpj?: string;
  cliente_nome?: string;
  last_success_at?: string;
  last_cursor?: string;
}

export function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY')!;
  return createClient(supabaseUrl, supabaseKey);
}

export async function upsertDreEntries(entries: DreEntry[]) {
  const supabase = getSupabaseClient();

  for (const entry of entries) {
    // Upsert baseado em (company_cnpj, date, account)
    const { error } = await supabase
      .from('dre_entries')
      .upsert(
        {
          company_cnpj: entry.company_cnpj,
          company_nome: entry.company_nome,
          date: entry.date,
          account: entry.account,
          nature: entry.nature,
          amount: entry.amount,
        },
        {
          onConflict: 'company_cnpj,date,account',
          ignoreDuplicates: false,
        }
      );

    if (error) {
      console.error('Error upserting DRE entry:', error);
    }
  }
}

export async function upsertCashflowEntries(entries: CashflowEntry[]) {
  const supabase = getSupabaseClient();

  for (const entry of entries) {
    // Upsert baseado em (company_cnpj, date, category, kind)
    const { error } = await supabase
      .from('cashflow_entries')
      .upsert(
        {
          company_cnpj: entry.company_cnpj,
          company_nome: entry.company_nome,
          date: entry.date,
          kind: entry.kind,
          category: entry.category,
          amount: entry.amount,
        },
        {
          onConflict: 'company_cnpj,date,category,kind',
          ignoreDuplicates: false,
        }
      );

    if (error) {
      console.error('Error upserting cashflow entry:', error);
    }
  }
}

export async function updateSyncState(state: SyncState) {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('sync_state')
    .upsert(
      {
        source: state.source,
        cnpj: state.cnpj,
        cliente_nome: state.cliente_nome,
        last_success_at: state.last_success_at || new Date().toISOString(),
        last_cursor: state.last_cursor,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'source,cnpj,cliente_nome',
        ignoreDuplicates: false,
      }
    );

  if (error) {
    console.error('Error updating sync state:', error);
  }
}

export async function getSyncState(source: 'F360' | 'OMIE', cnpj?: string, cliente_nome?: string) {
  const supabase = getSupabaseClient();

  let query = supabase
    .from('sync_state')
    .select('*')
    .eq('source', source);

  if (cnpj) {
    query = query.eq('cnpj', cnpj);
  }

  if (cliente_nome) {
    query = query.eq('cliente_nome', cliente_nome);
  }

  const { data, error } = await query.single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error getting sync state:', error);
    return null;
  }

  return data as SyncState | null;
}

export async function decryptF360Token(id: string): Promise<string | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('decrypt_f360_token', { _id: id });

  if (error) {
    console.error('Error decrypting F360 token:', error);
    return null;
  }

  return data;
}

export async function decryptOmieKeys(id: string): Promise<{ app_key: string; app_secret: string } | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('decrypt_omie_keys', { _id: id });

  if (error) {
    console.error('Error decrypting OMIE keys:', error);
    return null;
  }

  return data;
}

export function onlyDigits(text: string): string {
  return text.replace(/[^0-9]/g, '');
}

export function corsHeaders(origin?: string) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  };
}
