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
      const {
        integration_name,
        api_key,
        api_secret,
        access_token,
        refresh_token,
        config_data,
        is_active
      } = await req.json()

      if (!integration_name) {
        return new Response(
          JSON.stringify({ error: 'Missing integration_name' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Criptografar credenciais usando Web Crypto API
      const encryptionKey = Deno.env.get('ENCRYPTION_KEY') || 'default-key-change-in-production'
      
      const encryptValue = async (value: string): Promise<string> => {
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
          encoder.encode(value)
        )

        const encryptedArray = new Uint8Array(encrypted)
        const combined = new Uint8Array(iv.length + encryptedArray.length)
        combined.set(iv)
        combined.set(encryptedArray, iv.length)
        return btoa(String.fromCharCode(...combined))
      }

      // Preparar dados para atualização
      const updateData: any = {
        config_data: config_data || {},
        is_active: is_active !== undefined ? is_active : false,
        updated_by: user.id
      }

      // Criptografar e adicionar credenciais se fornecidas
      if (api_key) {
        updateData.api_key_encrypted = await encryptValue(api_key)
      }
      if (api_secret) {
        updateData.api_secret_encrypted = await encryptValue(api_secret)
      }
      if (access_token) {
        updateData.access_token_encrypted = await encryptValue(access_token)
      }
      if (refresh_token) {
        updateData.refresh_token_encrypted = await encryptValue(refresh_token)
      }

      // Determinar se está configurado
      updateData.is_configured = !!(updateData.api_key_encrypted || updateData.api_secret_encrypted || 
                                    updateData.access_token_encrypted || updateData.refresh_token_encrypted ||
                                    (config_data && Object.keys(config_data).length > 0))

      // Atualizar usando função SQL
      const { error } = await supabaseClient.rpc('update_integration_config', {
        p_integration_name: integration_name,
        p_api_key: updateData.api_key_encrypted || null,
        p_api_secret: updateData.api_secret_encrypted || null,
        p_access_token: updateData.access_token_encrypted || null,
        p_refresh_token: updateData.refresh_token_encrypted || null,
        p_config_data: updateData.config_data,
        p_is_active: updateData.is_active,
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
      // Listar todas as configurações
      const { data, error } = await supabaseClient
        .from('integration_configs')
        .select('*')
        .order('category, display_name')

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Não retornar valores criptografados, apenas status
      const safeData = data.map(item => ({
        ...item,
        api_key_encrypted: item.api_key_encrypted ? '••••••••' : null,
        api_secret_encrypted: item.api_secret_encrypted ? '••••••••' : null,
        access_token_encrypted: item.access_token_encrypted ? '••••••••' : null,
        refresh_token_encrypted: item.refresh_token_encrypted ? '••••••••' : null
      }))

      return new Response(
        JSON.stringify(safeData),
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

