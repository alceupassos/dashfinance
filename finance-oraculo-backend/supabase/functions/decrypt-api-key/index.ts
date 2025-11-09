/**
 * Edge Function para descriptografar API keys (admin only)
 * ATENÇÃO: Use apenas para testes e debug
 * Nunca exponha este endpoint em produção sem autenticação forte
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decryptValue, getEncryptionKey } from '../_shared/decrypt.ts'

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

    // Verificar autenticação
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
        JSON.stringify({ error: 'Forbidden - Admin only' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST') {
      const { integration_name } = await req.json()

      if (!integration_name) {
        return new Response(
          JSON.stringify({ error: 'Missing integration_name' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Buscar configuração
      const { data: config, error: queryError } = await supabaseClient
        .from('integration_configs')
        .select('*')
        .eq('integration_name', integration_name)
        .single()

      if (queryError || !config) {
        return new Response(
          JSON.stringify({ error: 'Integration not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Descriptografar chaves
      const encryptionKey = getEncryptionKey()
      const decrypted: any = {
        integration_name: config.integration_name,
        display_name: config.display_name,
        category: config.category,
        is_active: config.is_active,
        is_configured: config.is_configured,
        config_data: config.config_data,
      }

      try {
        if (config.api_key_encrypted) {
          decrypted.api_key = await decryptValue(config.api_key_encrypted, encryptionKey)
        }
        if (config.api_secret_encrypted) {
          decrypted.api_secret = await decryptValue(config.api_secret_encrypted, encryptionKey)
        }
        if (config.access_token_encrypted) {
          decrypted.access_token = await decryptValue(config.access_token_encrypted, encryptionKey)
        }
        if (config.refresh_token_encrypted) {
          decrypted.refresh_token = await decryptValue(config.refresh_token_encrypted, encryptionKey)
        }
      } catch (error) {
        return new Response(
          JSON.stringify({ error: `Failed to decrypt: ${error.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Log para auditoria
      console.log(`[decrypt-api-key] Admin ${user.email} decrypted ${integration_name} keys`)

      return new Response(
        JSON.stringify({
          success: true,
          data: decrypted,
          warning: 'ATENÇÃO: Esta função deve ser usada apenas para testes. Nunca exponha chaves em produção.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'GET') {
      // Listar todas as integrações (sem descriptografar)
      const { data: configs, error: listError } = await supabaseClient
        .from('integration_configs')
        .select('integration_name, display_name, category, is_active, is_configured, updated_at')
        .order('category, display_name')

      if (listError) {
        return new Response(
          JSON.stringify({ error: listError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          integrations: configs,
          message: 'Use POST para descriptografar uma integração específica'
        }),
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

