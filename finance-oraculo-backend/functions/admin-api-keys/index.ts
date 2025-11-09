// ===================================================
// Edge Function: admin/api-keys
// CRUD de API Keys (apenas admin)
// ===================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Função para gerar API key
function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'sk_';
  for (let i = 0; i < 48; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// Hash SHA256
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

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
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // ==================== GET - LISTAR API KEYS ====================
    if (req.method === 'GET') {
      const { data: keys, error } = await supabase
        .from('user_api_keys')
        .select('id, label, key_prefix, status, last_used_at, expires_at, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('List API keys error:', error);
        return new Response(JSON.stringify({ error: 'Erro ao listar chaves' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ keys: keys || [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ==================== POST - CRIAR API KEY ====================
    if (req.method === 'POST') {
      const { label, scopes, expires_in_days } = await req.json();

      if (!label) {
        return new Response(JSON.stringify({ error: 'Label obrigatório' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Gerar chave
      const apiKey = generateApiKey();
      const keyHash = await hashApiKey(apiKey);
      const keyPrefix = apiKey.substring(0, 8);

      // Calcular expiração
      let expiresAt = null;
      if (expires_in_days) {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + expires_in_days);
        expiresAt = expDate.toISOString();
      }

      // Inserir no banco
      const { data: newKey, error: insertError } = await supabase
        .from('user_api_keys')
        .insert({
          user_id: user.id,
          label,
          key_prefix: keyPrefix,
          key_hash: keyHash,
          scopes: scopes || ['read'],
          status: 'active',
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Create API key error:', insertError);
        return new Response(JSON.stringify({ error: 'Erro ao criar chave' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        key: apiKey, // Retorna chave completa apenas uma vez!
        key_id: newKey.id,
        key_prefix: keyPrefix,
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ==================== PUT - ATUALIZAR API KEY ====================
    if (req.method === 'PUT') {
      const url = new URL(req.url);
      const keyId = url.pathname.split('/').pop();

      if (!keyId || keyId === 'admin-api-keys') {
        return new Response(JSON.stringify({ error: 'ID da chave obrigatório' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { label, status, scopes } = await req.json();

      const updates: any = {};
      if (label) updates.label = label;
      if (status) updates.status = status;
      if (scopes) updates.scopes = scopes;

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();

        const { error: updateError } = await supabase
          .from('user_api_keys')
          .update(updates)
          .eq('id', keyId);

        if (updateError) {
          console.error('Update API key error:', updateError);
          return new Response(JSON.stringify({ error: 'Erro ao atualizar chave' }), {
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

    // ==================== DELETE - REVOGAR API KEY ====================
    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const keyId = url.pathname.split('/').pop();

      if (!keyId || keyId === 'admin-api-keys') {
        return new Response(JSON.stringify({ error: 'ID da chave obrigatório' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Marcar como revoked ao invés de deletar (audit trail)
      const { error: deleteError } = await supabase
        .from('user_api_keys')
        .update({ status: 'revoked', updated_at: new Date().toISOString() })
        .eq('id', keyId);

      if (deleteError) {
        console.error('Revoke API key error:', deleteError);
        return new Response(JSON.stringify({ error: 'Erro ao revogar chave' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Admin API keys error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
