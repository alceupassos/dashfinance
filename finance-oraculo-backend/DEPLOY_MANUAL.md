# Deploy Manual das Edge Functions

Como você não tem permissões de CLI no projeto, vamos fazer o deploy via interface web.

## Passo 1: Acessar Edge Functions

Acesse: https://supabase.com/dashboard/project/xzrmzmcoslomtzkzgskn/functions

## Passo 2: Deploy Cada Função

### Função 1: sync-f360

1. Clique em "**Create a new function**"
2. Nome: `sync-f360`
3. **IMPORTANTE**: Primeiro, crie um arquivo comum para ser importado

#### Criar módulo comum (import_map.json)

Crie primeiro o arquivo de configuração:

**Nome do arquivo**: `import_map.json`
```json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2"
  }
}
```

#### Código da função sync-f360

Cole o seguinte código combinado (inclui o common/db.ts inline):

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ===== COMMON/DB.TS (INLINE) =====
interface DreEntry {
  company_cnpj: string;
  company_nome?: string;
  date: string;
  account: string;
  nature: 'receita' | 'custo' | 'despesa' | 'outras';
  amount: number;
}

interface CashflowEntry {
  company_cnpj: string;
  company_nome?: string;
  date: string;
  kind: 'in' | 'out';
  category?: string;
  amount: number;
}

interface SyncState {
  source: 'F360' | 'OMIE';
  cnpj?: string;
  cliente_nome?: string;
  last_success_at?: string;
  last_cursor?: string;
}

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY')!;
  return createClient(supabaseUrl, supabaseKey);
}

async function upsertDreEntries(entries: DreEntry[]) {
  const supabase = getSupabaseClient();
  for (const entry of entries) {
    const { error } = await supabase
      .from('dre_entries')
      .upsert(entry, { onConflict: 'company_cnpj,date,account' });
    if (error) console.error('Error upserting DRE entry:', error);
  }
}

async function upsertCashflowEntries(entries: CashflowEntry[]) {
  const supabase = getSupabaseClient();
  for (const entry of entries) {
    const { error } = await supabase
      .from('cashflow_entries')
      .upsert(entry, { onConflict: 'company_cnpj,date,category,kind' });
    if (error) console.error('Error upserting cashflow entry:', error);
  }
}

async function updateSyncState(state: SyncState) {
  const supabase = getSupabaseClient();
  await supabase.from('sync_state').upsert({
    ...state,
    last_success_at: state.last_success_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'source,cnpj,cliente_nome' });
}

async function getSyncState(source: 'F360' | 'OMIE', cnpj?: string, cliente_nome?: string) {
  const supabase = getSupabaseClient();
  let query = supabase.from('sync_state').select('*').eq('source', source);
  if (cnpj) query = query.eq('cnpj', cnpj);
  if (cliente_nome) query = query.eq('cliente_nome', cliente_nome);
  const { data, error } = await query.single();
  if (error && error.code !== 'PGRST116') console.error('Error getting sync state:', error);
  return data as SyncState | null;
}

function onlyDigits(text: string): string {
  return text.replace(/[^0-9]/g, '');
}

function corsHeaders(origin?: string) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  };
}

// ===== SYNC-F360 LOGIC =====
const F360_API_BASE = Deno.env.get('F360_API_BASE') || 'https://app.f360.com.br/api';

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
  const url = new URL(`${F360_API_BASE}/transactions`);
  if (cursor) url.searchParams.set('cursor', cursor);

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) throw new Error(`F360 API error: ${response.status}`);
  return await response.json();
}

function mapF360ToDre(transaction: F360Transaction, cnpj: string, nome?: string): DreEntry | null {
  let nature: 'receita' | 'custo' | 'despesa' | 'outras';
  switch (transaction.type) {
    case 'revenue': nature = 'receita'; break;
    case 'cost': nature = 'custo'; break;
    case 'expense': nature = 'despesa'; break;
    case 'other': nature = 'outras'; break;
    default: return null;
  }
  return { company_cnpj: cnpj, company_nome: nome, date: transaction.date, account: transaction.account, nature, amount: transaction.amount };
}

function mapF360ToCashflow(transaction: F360Transaction, cnpj: string, nome?: string): CashflowEntry | null {
  const kind = transaction.amount >= 0 ? 'in' : 'out';
  return { company_cnpj: cnpj, company_nome: nome, date: transaction.date, kind, category: transaction.category || 'Sem categoria', amount: Math.abs(transaction.amount) };
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
        if (dreEntry) dreEntries.push(dreEntry);
        const cfEntry = mapF360ToCashflow(transaction, cleanCnpj, clienteNome);
        if (cfEntry) cashflowEntries.push(cfEntry);
      }

      if (dreEntries.length > 0) await upsertDreEntries(dreEntries);
      if (cashflowEntries.length > 0) await upsertCashflowEntries(cashflowEntries);

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
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders() });

  try {
    const supabase = getSupabaseClient();
    const { data: integrations, error } = await supabase.from('integration_f360').select('*');
    if (error) throw error;

    const results = [];
    for (const integration of integrations || []) {
      const { data: tokenData, error: decryptError } = await supabase.rpc('decrypt_f360_token', { _id: integration.id });
      if (decryptError || !tokenData) {
        console.error(`Failed to decrypt token for ${integration.cliente_nome}`);
        continue;
      }

      const count = await syncF360Integration(integration.id, integration.cliente_nome, integration.cnpj, tokenData);
      results.push({ cliente: integration.cliente_nome, cnpj: integration.cnpj, synced: count });
    }

    return new Response(JSON.stringify({ success: true, results, timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Sync F360 error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }
});
```

4. Clique em "**Deploy**"

---

### Função 2: sync-omie

Repita o processo acima, mas use o código do arquivo `functions/sync-omie/index.ts` combinado com o common/db.ts.

Por ser muito extenso, vou criar arquivos separados prontos para copiar e colar.

---

## Alternativa Mais Simples

Vou criar um script que gera arquivos únicos (standalone) para cada função, prontos para copiar e colar diretamente na interface web.

Execute:
```bash
./generate-standalone-functions.sh
```

Isso criará arquivos na pasta `standalone/` prontos para deploy.

## Após Deploy

Configure os secrets em:
https://supabase.com/dashboard/project/xzrmzmcoslomtzkzgskn/settings/functions

Secrets necessários (copie do .env):
```
SUPABASE_URL
SUPABASE_SERVICE_KEY
SUPABASE_ANON_KEY
DATABASE_URL
OPENAI_API_KEY
ANTHROPIC_API_KEY
KMS_SECRET
F360_API_BASE
OMIE_API_BASE
```
