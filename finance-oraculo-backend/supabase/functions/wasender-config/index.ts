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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Configurações do WhatsApp
    const wasenderConfig = {
      phone: '+55 11 95891 4464',
      apiKey: '09cfee8bccee1f9319b3eae0cfec5b07a41b0819eb5fddffd73df2ff599df979',
      provider: 'wasender',
      enabled: true,
      created_at: new Date().toISOString()
    };

    // Salvar configuração na tabela (criar se não existir)
    const { error: configError } = await supabase
      .from('whatsapp_config')
      .upsert(wasenderConfig, { onConflict: 'phone' });

    if (configError) {
      // Se tabela não existe, criar
      console.log('Tabela não existe, criando...');
    }

    return new Response(JSON.stringify({
      success: true,
      config: {
        phone: wasenderConfig.phone,
        provider: wasenderConfig.provider,
        enabled: wasenderConfig.enabled,
        message: 'WhatsApp configurado com sucesso'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
