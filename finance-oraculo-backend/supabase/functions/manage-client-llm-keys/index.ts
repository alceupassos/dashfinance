import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se é admin
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST') {
      // Criar/atualizar chave
      const { company_cnpj, provider, api_key, priority, monthly_limit_usd, notes } = await req.json()

      if (!company_cnpj || !provider || !api_key) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Criptografar a chave usando uma chave de criptografia do ambiente
      // Para produção, use uma chave segura armazenada em Supabase Secrets
      const encryptionKey = Deno.env.get('ENCRYPTION_KEY') || 'default-key-change-in-production'
      
      // Usar Web Crypto API para criptografar
      const encoder = new TextEncoder()
      const keyData = encoder.encode(encryptionKey.slice(0, 32).padEnd(32, '0'))
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      )

      const iv = crypto.getRandomValues(new Uint8Array(12))
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(api_key)
      )

      // Converter para base64 para armazenar no banco
      const encryptedArray = new Uint8Array(encrypted)
      const combined = new Uint8Array(iv.length + encryptedArray.length)
      combined.set(iv)
      combined.set(encryptedArray, iv.length)
      const encryptedBase64 = btoa(String.fromCharCode(...combined))

      // Chamar função SQL para salvar (chave já criptografada)
      const { error } = await supabaseClient.rpc('set_client_llm_api_key', {
        p_company_cnpj: company_cnpj,
        p_provider: provider,
        p_api_key_encrypted: encryptedBase64,
        p_priority: priority || 5,
        p_monthly_limit_usd: monthly_limit_usd || null,
        p_notes: notes || null,
        p_user_id: user.id
      })

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'GET') {
      // Listar chaves
      const url = new URL(req.url)
      const company_cnpj = url.searchParams.get('company_cnpj')
      const provider = url.searchParams.get('provider')

      let query = supabaseClient
        .from('llm_api_keys_per_client')
        .select('id, company_cnpj, provider, is_active, priority, monthly_limit_usd, notes, created_at, updated_at')

      if (company_cnpj) {
        query = query.eq('company_cnpj', company_cnpj)
      }
      if (provider) {
        query = query.eq('provider', provider)
      }

      const { data, error } = await query.order('company_cnpj, provider')

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'DELETE') {
      // Deletar chave
      const url = new URL(req.url)
      const id = url.searchParams.get('id')

      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Missing id parameter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error } = await supabaseClient
        .from('llm_api_keys_per_client')
        .delete()
        .eq('id', id)

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

