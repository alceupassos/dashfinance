import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getSupabaseClient, onlyDigits, corsHeaders } from '../common/db.ts';
import { syncF360TokenGroup, F360Company } from '../common/f360-sync.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const supabase = getSupabaseClient();
    const { data: integrations, error } = await supabase
      .from('integration_f360')
      .select('id, cliente_nome, cnpj, token_enc');

    if (error) {
      throw error;
    }

    const tokenGroups = new Map<string, { token: string; companies: F360Company[] }>();
    const results: Array<{ cliente: string; cnpj: string; synced?: number; status: string; error?: string }> = [];

    for (const integration of integrations || []) {
      if (!integration.cnpj) {
        results.push({
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
          results.push({
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
          results.push({
            cliente: company.cliente_nome,
            cnpj: company.cnpj,
            synced: summary.countsByCnpj.get(normalized) ?? 0,
            status: 'success',
          });
        }
      } catch (error) {
        console.error('Error syncing token group:', error);
        for (const company of group.companies) {
          results.push({
            cliente: company.cliente_nome,
            cnpj: company.cnpj,
            status: 'error',
            error: (error as Error).message || 'Erro desconhecido',
          });
        }
      }
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
      JSON.stringify({ error: (error as Error).message || 'Erro interno' }),
      {
        status: 500,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      }
    );
  }
});
