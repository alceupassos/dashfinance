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

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    const [{ data: clientesData }, { data: integrationF360 }, { data: integrationAliases }, { data: integrationOmie }] =
      await Promise.all([
        supabase.from('clientes').select('id, razao_social, cnpj, status').order('razao_social'),
        supabase.from('integration_f360').select('id, cliente_nome, cnpj'),
        supabase.from('integration_f360_aliases').select('integration_id, alias'),
        supabase.from('integration_omie').select('cliente_nome')
      ]);

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

    // Processar integrações F360
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

    // Processar aliases complementares de integrações F360
    (integrationAliases ?? []).forEach((aliasRow: any) => {
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

    const groupAliases =
      (aliasesData || []).map((row: any) => ({
        id: row.id,
        value: row.id,
        label: row.label,
        members: membersByAlias.get(row.id) || [],
        active: true,
        sources: ['group']
      })) ?? [];

    const integrationAliasOptions = companyOptions.map((company) => ({
      id: `cnpj:${company.value}`,
      value: `cnpj:${company.value}`,
      label: company.label,
      members: [company.value],
      active: company.active,
      sources: company.sources
    }));

    const aliases = [...groupAliases, ...integrationAliasOptions];

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
