import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getSupabaseClient, onlyDigits, corsHeaders } from '../common/db.ts';
import { syncF360TokenGroup, F360Company } from '../common/f360-sync.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const supabase = getSupabaseClient();
    
    // Tentar múltiplas abordagens para evitar problemas de cache do schema
    let integrations: Array<{ id: string; cliente_nome: string; cnpj: string; token: string }> = [];
    
    // Tentativa 1: RPC function
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_f360_integrations');
    
    if (!rpcError && rpcData) {
      integrations = rpcData;
    } else {
      // Tentativa 2: SELECT direto com token
      const { data: tokenData, error: tokenError } = await supabase
        .from('integration_f360')
        .select('id, cliente_nome, cnpj, token');
      
      if (!tokenError && tokenData) {
        integrations = tokenData.map((item: any) => {
          const tokenValue = item.token || item.token_plain || '';
          console.log(`Token for ${item.cliente_nome}: ${tokenValue ? 'found' : 'missing'}`);
          return {
            id: item.id,
            cliente_nome: item.cliente_nome,
            cnpj: item.cnpj,
            token: tokenValue
          };
        });
      } else {
        // Tentativa 3: SELECT com token_plain
        const { data: plainData, error: plainError } = await supabase
          .from('integration_f360')
          .select('id, cliente_nome, cnpj, token_plain');
        
        if (!plainError && plainData) {
          integrations = plainData.map((item: any) => ({
            id: item.id,
            cliente_nome: item.cliente_nome,
            cnpj: item.cnpj,
            token: item.token_plain || ''
          }));
        } else {
          // Tentativa 4: SELECT todas as colunas e mapear
          const { data: allData, error: allError } = await supabase
            .from('integration_f360')
            .select('*');
          
          if (allError) {
            throw new Error(`Failed to fetch integrations: ${allError.message}`);
          }
          
          integrations = (allData || []).map((item: any) => {
            // Debug: log para ver o que está vindo
            console.log('Item:', JSON.stringify({
              id: item.id,
              cliente_nome: item.cliente_nome,
              cnpj: item.cnpj,
              has_token: !!item.token,
              has_token_plain: !!item.token_plain,
              token_length: item.token?.length || 0,
              token_plain_length: item.token_plain?.length || 0
            }));
            
            return {
              id: item.id,
              cliente_nome: item.cliente_nome,
              cnpj: item.cnpj,
              token: item.token || item.token_plain || item.token_enc || ''
            };
          });
        }
      }
    }
    
    if (integrations.length === 0) {
      throw new Error('No integrations found');
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

      if (!integration.token) {
        results.push({
          cliente: integration.cliente_nome,
          cnpj: integration.cnpj,
          status: 'error',
          error: 'Token não encontrado',
        });
        continue;
      }

      const tokenKey = String(integration.token);
      let group = tokenGroups.get(tokenKey);

      if (!group) {
        group = { token: integration.token, companies: [] };
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

    // After syncing individual companies, aggregate data for groups
    console.log('Aggregating group data...');
    const { data: groups, error: groupsError } = await supabase
      .from('company_groups')
      .select('group_cnpj, group_name')
      .eq('is_active', true);

    if (!groupsError && groups) {
      for (const group of groups) {
        try {
          console.log(`Aggregating data for group: ${group.group_name} (${group.group_cnpj})`);
          
          // Aggregate DRE entries
          const { error: dreError } = await supabase.rpc('upsert_group_dre_entries', {
            _group_cnpj: group.group_cnpj,
          });
          
          if (dreError) {
            console.error(`Error aggregating DRE for ${group.group_name}:`, dreError);
          } else {
            console.log(`✓ Aggregated DRE for ${group.group_name}`);
          }

          // Aggregate cashflow entries
          const { error: cfError } = await supabase.rpc('upsert_group_cashflow_entries', {
            _group_cnpj: group.group_cnpj,
          });
          
          if (cfError) {
            console.error(`Error aggregating cashflow for ${group.group_name}:`, cfError);
          } else {
            console.log(`✓ Aggregated cashflow for ${group.group_name}`);
          }
        } catch (error) {
          console.error(`Error processing group ${group.group_name}:`, error);
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
