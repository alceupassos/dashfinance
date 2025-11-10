import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// Verificar se usuário autenticado é admin
async function isAdmin(userId: string) {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  return data?.role === 'admin';
}

async function fetchUserCompanies(userIds: string[]) {
  if (!userIds.length) {
    return new Map<string, string[]>();
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('user_companies')
    .select('user_id, company_cnpj')
    .in('user_id', userIds);

  if (error) {
    console.error('Failed to fetch user companies', error);
    return new Map<string, string[]>();
  }

  const map = new Map<string, string[]>();
  data?.forEach((item) => {
    const list = map.get(item.user_id) ?? [];
    list.push(item.company_cnpj);
    map.set(item.user_id, list);
  });
  return map;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    // Pegar usuário autenticado do header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é admin
    const admin = await isAdmin(user.id);
    if (!admin && req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas administradores.' }),
        { status: 403, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');

    // GET - Listar usuários
    if (req.method === 'GET') {
      if (userId) {
        const { data: userRecord, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (userError) throw userError;

        const companiesMap = await fetchUserCompanies([userRecord.id]);
        const companies = companiesMap.get(userRecord.id) ?? [];
        const hasFullAccess = userRecord.role === 'admin' || userRecord.role === 'executivo_conta';

        const payload = {
          ...userRecord,
          available_companies: hasFullAccess ? ['*'] : companies,
          default_company_cnpj: userRecord.company_cnpj,
          has_full_access: hasFullAccess,
        };

        return new Response(JSON.stringify(payload), {
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
        });
      }

      const role = url.searchParams.get('role');
      const status = url.searchParams.get('status');

      let query = supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (role) query = query.eq('role', role);
      if (status) query = query.eq('status', status);

      const { data: usersData, error: usersError } = await query;
      if (usersError) throw usersError;

      const companiesMap = await fetchUserCompanies(usersData.map((item) => item.id));

      const processed = usersData.map((record) => {
        const companies = companiesMap.get(record.id) ?? [];
        const hasFullAccess = record.role === 'admin' || record.role === 'executivo_conta';
        return {
          ...record,
          available_companies: hasFullAccess ? ['*'] : companies,
          default_company_cnpj: record.company_cnpj,
          has_full_access: hasFullAccess,
        };
      });

      return new Response(JSON.stringify(processed), {
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    }

    // POST - Criar usuário
    if (req.method === 'POST') {
      const body = await req.json();
      const email = body.email?.trim();
      const password = body.password;
      const inputName = body.full_name ?? body.name;
      const role = body.role ?? 'viewer';
      const status = body.status ?? 'active';
      const rawCompanies = Array.isArray(body.available_companies) ? body.available_companies : [];
      const uniqueCompanies = Array.from(new Set(rawCompanies.filter((item: unknown) => typeof item === 'string' && item)));
      const fullAccess =
        Boolean(body.full_access) || role === 'admin' || role === 'executivo_conta';

      if (!email || !password || !inputName) {
        return new Response(
          JSON.stringify({ error: 'Campos obrigatórios: email, password, nome' }),
          { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        );
      }

      const restrictedRole = role === 'cliente' || role === 'cliente_multi';
      if (restrictedRole && !fullAccess && uniqueCompanies.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Cliente precisa ter ao menos uma empresa atribuída' }),
          { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        );
      }

      const now = new Date().toISOString();
      const defaultCompany = fullAccess
        ? body.default_company_cnpj ?? null
        : body.default_company_cnpj ?? uniqueCompanies[0] ?? null;

      // Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: inputName,
          role
        }
      });

      if (authError) throw authError;

      const userId = authData.user.id;

      // Inserir em users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email,
          full_name: inputName,
          role,
          status,
          company_cnpj: defaultCompany,
          created_by: user.id,
          created_at: now,
          updated_at: now
        })
        .select()
        .single();

      if (userError) throw userError;

      // Upsert profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email,
          name: inputName,
          role,
          default_company_cnpj: defaultCompany,
          created_at: now,
          updated_at: now
        });

      if (profileError) throw profileError;

      // Gerenciar empresas
      if (!fullAccess && uniqueCompanies.length > 0) {
        const inserts = uniqueCompanies.map((companyCnpj: string) => ({
          user_id: userId,
          company_cnpj: companyCnpj,
          access_level: 'view',
          created_at: now
        }));
        const { error: companiesError } = await supabase
          .from('user_companies')
          .insert(inserts);

        if (companiesError) throw companiesError;
      }

      // Log audit
      await supabase.from('audit_log').insert({
        user_id: user.id,
        action: 'create',
        resource_type: 'user',
        resource_id: userData.id,
        new_value: {
          ...userData,
          available_companies: fullAccess ? ['*'] : uniqueCompanies,
          default_company_cnpj: defaultCompany,
          has_full_access: fullAccess
        }
      });

      return new Response(
        JSON.stringify({
          ...userData,
          available_companies: fullAccess ? ['*'] : uniqueCompanies,
          default_company_cnpj: defaultCompany,
          has_full_access: fullAccess
        }),
        { status: 201, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // PUT - Atualizar usuário
    if (req.method === 'PUT') {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'userId é obrigatório' }),
          { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const { data: oldData, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError || !oldData) {
        return new Response(
          JSON.stringify({ error: 'Usuário não encontrado' }),
          { status: 404, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        );
      }

      const nextName = body.name ?? oldData.full_name;
      const nextRole = body.role ?? oldData.role;
      const nextStatus = body.status ?? oldData.status;
      const rawCompanies = Array.isArray(body.available_companies) ? body.available_companies : [];
      const uniqueCompanies = Array.from(new Set(rawCompanies.filter((item: unknown) => typeof item === 'string' && item)));
      const resolvedFullAccess =
        Boolean(body.full_access) || nextRole === 'admin' || nextRole === 'executivo_conta';

      const restrictedRole = nextRole === 'cliente' || nextRole === 'cliente_multi';
      if (restrictedRole && !resolvedFullAccess && uniqueCompanies.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Cliente precisa ter ao menos uma empresa atribuída' }),
          { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        );
      }

      const defaultCompany = resolvedFullAccess
        ? body.default_company_cnpj ?? oldData.company_cnpj ?? null
        : body.default_company_cnpj ?? uniqueCompanies[0] ?? null;

      const now = new Date().toISOString();

      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          full_name: nextName,
          role: nextRole,
          status: nextStatus,
          company_cnpj: defaultCompany,
          updated_at: now,
        })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) throw updateError;

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: updatedUser.email,
          name: nextName,
          role: nextRole,
          default_company_cnpj: defaultCompany,
          updated_at: now
        });

      if (profileError) throw profileError;

      await supabase.from('user_companies').delete().eq('user_id', userId);

      if (!resolvedFullAccess && uniqueCompanies.length > 0) {
        const inserts = uniqueCompanies.map((companyCnpj: string) => ({
          user_id: userId,
          company_cnpj: companyCnpj,
          access_level: 'view',
          created_at: now
        }));
        const { error: insertCompaniesError } = await supabase
          .from('user_companies')
          .insert(inserts);

        if (insertCompaniesError) throw insertCompaniesError;
      }

      const payload = {
        ...updatedUser,
        available_companies: resolvedFullAccess ? ['*'] : uniqueCompanies,
        default_company_cnpj: defaultCompany,
        has_full_access: resolvedFullAccess,
      };

      await supabase.from('audit_log').insert({
        user_id: user.id,
        action: 'update',
        resource_type: 'user',
        resource_id: userId,
        old_value: oldData,
        new_value: payload,
      });

      return new Response(
        JSON.stringify(payload),
        { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // DELETE - Deletar usuário
    if (req.method === 'DELETE') {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'userId é obrigatório' }),
          { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        );
      }

      // Buscar dados antes de deletar
      const { data: oldData } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      // Deletar do Auth
      await supabase.auth.admin.deleteUser(userId);

      // Log audit
      await supabase.from('audit_log').insert({
        user_id: user.id,
        action: 'delete',
        resource_type: 'user',
        resource_id: userId,
        old_value: oldData,
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Usuário deletado' }),
        { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Método não suportado' }),
      { status: 405, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin users error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    );
  }
});
