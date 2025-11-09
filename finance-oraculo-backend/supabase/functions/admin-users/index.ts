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
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  return data?.role === 'admin';
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
        // Buscar usuário específico
        const { data, error } = await supabase
          .from('users')
          .select(`
            *,
            user_permissions(*),
            user_company_access(*)
          `)
          .eq('id', userId)
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        );
      } else {
        // Listar todos os usuários
        const role = url.searchParams.get('role');
        const status = url.searchParams.get('status');

        let query = supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        if (role) query = query.eq('role', role);
        if (status) query = query.eq('status', status);

        const { data, error } = await query;

        if (error) throw error;

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        );
      }
    }

    // POST - Criar usuário
    if (req.method === 'POST') {
      const body = await req.json();
      const { email, password, full_name, role, company_cnpj } = body;

      // Validação
      if (!email || !password || !full_name || !role) {
        return new Response(
          JSON.stringify({ error: 'Campos obrigatórios: email, password, full_name, role' }),
          { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        );
      }

      // Cliente deve ter CNPJ
      if (role === 'cliente' && !company_cnpj) {
        return new Response(
          JSON.stringify({ error: 'Cliente deve ter company_cnpj' }),
          { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        );
      }

      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError) throw authError;

      // Criar registro na tabela users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          full_name,
          role,
          company_cnpj: role === 'cliente' ? company_cnpj : null,
          created_by: user.id,
        })
        .select()
        .single();

      if (userError) throw userError;

      // Log audit
      await supabase.from('audit_log').insert({
        user_id: user.id,
        action: 'create',
        resource_type: 'user',
        resource_id: userData.id,
        new_value: userData,
      });

      return new Response(
        JSON.stringify(userData),
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

      // Buscar estado anterior
      const { data: oldData } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      // Atualizar
      const { data: newData, error } = await supabase
        .from('users')
        .update({
          ...body,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      // Log audit
      await supabase.from('audit_log').insert({
        user_id: user.id,
        action: 'update',
        resource_type: 'user',
        resource_id: userId,
        old_value: oldData,
        new_value: newData,
      });

      return new Response(
        JSON.stringify(newData),
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
