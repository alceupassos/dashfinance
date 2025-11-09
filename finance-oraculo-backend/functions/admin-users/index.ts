// ===================================================
// Edge Function: admin/users
// CRUD completo de usuários (apenas admin)
// ===================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Cliente com anon key para auth
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Cliente com service key para operações admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar se é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ==================== GET - LISTAR USUÁRIOS ====================
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const role = url.searchParams.get('role');
      const status = url.searchParams.get('status');
      const search = url.searchParams.get('search');

      const offset = (page - 1) * limit;

      // Query base
      let query = supabaseAdmin
        .from('v_users_with_access')
        .select('*', { count: 'exact' });

      // Filtros
      if (role) query = query.eq('role', role);
      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      // Paginação
      query = query.range(offset, offset + limit - 1);
      query = query.order('created_at', { ascending: false });

      const { data: users, error, count } = await query;

      if (error) {
        console.error('List users error:', error);
        return new Response(JSON.stringify({ error: 'Erro ao listar usuários' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const usersList = (users || []).map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.last_sign_in_at ? 'active' : 'inactive',
        created_at: u.created_at,
        last_login_at: u.last_sign_in_at,
        two_factor_enabled: u.two_factor_enabled,
      }));

      return new Response(JSON.stringify({ users: usersList, total: count }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ==================== POST - CRIAR USUÁRIO ====================
    if (req.method === 'POST') {
      const { email, name, role, password } = await req.json();

      if (!email || !name) {
        return new Response(JSON.stringify({ error: 'Email e nome são obrigatórios' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Criar usuário no Auth
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: password || Math.random().toString(36).slice(-12), // Senha aleatória se não fornecida
        email_confirm: true,
        user_metadata: { name, role: role || 'viewer' },
      });

      if (createError || !newUser.user) {
        console.error('Create user error:', createError);
        return new Response(JSON.stringify({ error: 'Erro ao criar usuário' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Criar perfil
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: newUser.user.id,
          email,
          name,
          role: role || 'viewer',
        });

      if (profileError) {
        console.error('Create profile error:', profileError);
      }

      // TODO: Enviar email de convite

      return new Response(JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email,
          name,
          role: role || 'viewer',
        },
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ==================== PUT - ATUALIZAR USUÁRIO ====================
    if (req.method === 'PUT') {
      const url = new URL(req.url);
      const userId = url.pathname.split('/').pop();

      if (!userId || userId === 'admin-users') {
        return new Response(JSON.stringify({ error: 'ID do usuário obrigatório' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { name, role, email } = await req.json();

      // Atualizar perfil
      const updates: any = {};
      if (name) updates.name = name;
      if (role) updates.role = role;
      if (email) updates.email = email;

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();

        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update(updates)
          .eq('id', userId);

        if (updateError) {
          console.error('Update profile error:', updateError);
          return new Response(JSON.stringify({ error: 'Erro ao atualizar usuário' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ==================== DELETE - DELETAR USUÁRIO ====================
    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const userId = url.pathname.split('/').pop();

      if (!userId || userId === 'admin-users') {
        return new Response(JSON.stringify({ error: 'ID do usuário obrigatório' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Deletar usuário (cascade deleta perfil)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteError) {
        console.error('Delete user error:', deleteError);
        return new Response(JSON.stringify({ error: 'Erro ao deletar usuário' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Método não permitido
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Admin users error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
