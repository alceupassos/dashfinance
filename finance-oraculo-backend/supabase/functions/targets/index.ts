import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Create client for auth check
    const authClient = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error: authError } = await authClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create client for data operations
    const supabase = createClient(supabaseUrl, supabaseKey);

    const normalize = (value?: string | null) =>
      (value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

    const sanitizeCnpj = (value?: string | null) => (value ?? '').replace(/[^0-9]/g, '');

    const ensureCompany = (cnpj: string) => {
      if (!companies.has(cnpj)) {
        companies.set(cnpj, {
          cnpj,
          label: undefined,
          aliases: new Set<string>(),
          sources: new Set<string>(),
          status: undefined
        });
      }
      return companies.get(cnpj)!;
    };

    const companies = new Map<
      string,
      {
        cnpj: string;
        label?: string;
        aliases: Set<string>;
        sources: Set<string>;
        status?: string | null;
      }
    >();

    const nameIndex = new Map<string, string>();

    // Buscar aliases agrupados já existentes
    const [{ data: aliasesData }, { data: membersData }] = await Promise.all([
      supabase.from('group_aliases').select('id, label, description'),
      supabase.from('group_alias_members').select('alias_id, company_id')
    ]);

    // Buscar lista principal de clientes (fallback para clientes_final quando clientes não existir)
    let clientesData: any[] = [];
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, razao_social, cnpj, status')
        .order('razao_social');

      if (error) {
        if (error.code === '42P01') {
          const fallback = await supabase
            .from('clientes_final')
            .select('id, razao_social, cnpj, status')
            .order('razao_social');

          if (!fallback.error) {
            clientesData = fallback.data ?? [];
          } else {
            console.warn('[targets] Falha ao consultar clientes_final:', fallback.error.message);
          }
        } else {
          console.warn('[targets] Erro ao consultar clientes:', error.message);
        }
      } else {
        clientesData = data ?? [];
      }
    } catch (err) {
      console.error('[targets] Exceção ao carregar clientes:', err);
    }

    const [integrationF360Result, integrationAliasesResult, integrationOmieResult, companyGroupsResult, groupMembersResult] =
      await Promise.all([
        supabase.from('integration_f360').select('id, cliente_nome, cnpj').eq('is_active', true),
        supabase.from('integration_f360_aliases').select('integration_id, alias'),
        supabase.from('integration_omie').select('cliente_nome'),
        supabase.from('company_groups').select('id, group_cnpj, group_name, description').eq('is_active', true),
        supabase.from('company_group_members').select('group_id, member_cnpj, member_name').eq('is_active', true)
      ]);

    const integrationF360 = integrationF360Result.error ? [] : integrationF360Result.data ?? [];
    const integrationAliases = integrationAliasesResult.error ? [] : integrationAliasesResult.data ?? [];
    const integrationOmie = integrationOmieResult.error ? [] : integrationOmieResult.data ?? [];
    const companyGroups = companyGroupsResult.error ? [] : companyGroupsResult.data ?? [];
    const groupMembers = groupMembersResult.error ? [] : groupMembersResult.data ?? [];

    // Preparar índice de clientes existentes
    (clientesData ?? []).forEach((client: any) => {
      const cnpj = sanitizeCnpj(client.cnpj);
      if (!cnpj) return;
      const entry = ensureCompany(cnpj);
      if (client.razao_social && !entry.label) {
        entry.label = client.razao_social;
      }
      if (client.razao_social) {
        entry.aliases.add(client.razao_social);
        nameIndex.set(normalize(client.razao_social), cnpj);
      }
      entry.status = client.status ?? entry.status;
    });

    const integrationIdToCnpj = new Map<string, string>();

    // Processar integrações F360 (apenas ativas)
    (integrationF360 ?? []).forEach((integration: any) => {
      const cnpj = sanitizeCnpj(integration.cnpj);
      if (!cnpj) return;
      integrationIdToCnpj.set(integration.id, cnpj);
      const entry = ensureCompany(cnpj);
      entry.sources.add('f360');
      const displayName = integration.cliente_nome?.trim();
      if (displayName) {
        if (!entry.label) {
          entry.label = displayName;
        }
        entry.aliases.add(displayName);
        nameIndex.set(normalize(displayName), cnpj);
      }
    });
    
    // Filtrar aliases para incluir apenas de integrações ativas
    const activeIntegrationIds = new Set(integrationF360.map((i: any) => i.id));

    // Processar aliases complementares de integrações F360 (apenas de integrações ativas)
    (integrationAliases ?? []).forEach((aliasRow: any) => {
      if (!activeIntegrationIds.has(aliasRow.integration_id)) return;
      const cnpj = aliasRow.integration_id ? integrationIdToCnpj.get(aliasRow.integration_id) : undefined;
      if (!cnpj) return;
      const aliasValue = aliasRow.alias?.trim();
      if (!aliasValue) return;
      const entry = ensureCompany(cnpj);
      entry.aliases.add(aliasValue);
      nameIndex.set(normalize(aliasValue), cnpj);
    });

    // Processar integrações Omie por nome
    (integrationOmie ?? []).forEach((omieRow: any) => {
      const normalized = normalize(omieRow.cliente_nome);
      if (!normalized) return;
      const cnpj = nameIndex.get(normalized);
      if (!cnpj) return;
      const entry = ensureCompany(cnpj);
      entry.sources.add('omie');
    });

    // Construir lista de empresas com CNPJ
    const companyOptions = Array.from(companies.values())
      .filter((entry) => entry.cnpj)
      .map((entry) => {
        const aliases = Array.from(entry.aliases);
        const label = entry.label ?? aliases[0] ?? entry.cnpj;
        return {
          value: entry.cnpj,
          label,
          cnpj: entry.cnpj,
          aliases,
          active: entry.sources.size > 0,
          sources: Array.from(entry.sources),
          status: entry.status ?? null
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' }));

    // Mapear membros por alias legado
    const membersByAlias = new Map<string, string[]>();
    (membersData || []).forEach((m: any) => {
      if (!membersByAlias.has(m.alias_id)) {
        membersByAlias.set(m.alias_id, []);
      }
      membersByAlias.get(m.alias_id)!.push(m.company_id);
    });

    // Mapear membros por grupo (company_groups)
    const membersByGroup = new Map<string, string[]>();
    (groupMembers || []).forEach((m: any) => {
      if (!membersByGroup.has(m.group_id)) {
        membersByGroup.set(m.group_id, []);
      }
      membersByGroup.get(m.group_id)!.push(m.member_cnpj);
    });

    // Adicionar grupos como empresas individuais também (para aparecer no seletor de CNPJ)
    (companyGroups || []).forEach((group: any) => {
      const cnpj = sanitizeCnpj(group.group_cnpj);
      if (!cnpj) return;
      const entry = ensureCompany(cnpj);
      entry.sources.add('group');
      if (group.group_name && !entry.label) {
        entry.label = group.group_name;
      }
      if (group.group_name) {
        entry.aliases.add(group.group_name);
        nameIndex.set(normalize(group.group_name), cnpj);
      }
    });

    const groupAliases =
      (aliasesData || []).map((row: any) => ({
        id: row.id,
        value: row.id,
        label: row.label,
        members: membersByAlias.get(row.id) || [],
        active: true,
        sources: ['group']
      })) ?? [];

    // Adicionar grupos de company_groups como aliases também
    const companyGroupAliases = (companyGroups || []).map((group: any) => ({
      id: `group:${group.group_cnpj}`,
      value: group.group_cnpj,
      label: group.group_name,
      members: membersByGroup.get(group.id) || [],
      active: true,
      sources: ['group'],
      description: group.description
    }));

    const allAliases = [...groupAliases, ...companyGroupAliases];

    const integrationAliasOptions = companyOptions.map((company) => ({
      id: `cnpj:${company.value}`,
      value: `cnpj:${company.value}`,
      label: company.label,
      members: [company.value],
      active: company.active,
      sources: company.sources
    }));

    const aliases = [...allAliases, ...integrationAliasOptions];

    return new Response(
      JSON.stringify({
        aliases,
        cnpjs: companyOptions
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in targets:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
