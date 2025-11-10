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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar configurações F360
    const { data: configs, error: configError } = await supabase
      .from('f360_config')
      .select('*')
      .eq('is_active', true);

    if (configError) {
      throw configError;
    }

    const results = [];

    for (const config of configs || []) {
      try {
        // Buscar empresas do F360 (mock por enquanto - substituir pela API real)
        const companies = await fetchF360Companies(config.api_key);
        
        // Inserir/atualizar empresas no banco
        for (const company of companies) {
          const { error: upsertError } = await supabase
            .from('f360_companies')
            .upsert({
              cnpj: company.cnpj,
              razao_social: company.razao_social,
              nome_fantasia: company.nome_fantasia,
              f360_config_id: config.id,
              is_active: true
            }, {
              onConflict: 'cnpj'
            });

          if (upsertError) {
            console.error(`Error upserting company ${company.cnpj}:`, upsertError);
          }
        }

        results.push({
          config_id: config.id,
          companies_synced: companies.length
        });
      } catch (error) {
        console.error(`Error syncing config ${config.id}:`, error);
        results.push({
          config_id: config.id,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in sync-f360-companies:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function fetchF360Companies(apiKey: string) {
  // Mock de empresas do F360 para o Grupo Volpe
  // TODO: Substituir pela chamada real à API do F360
  return [
    {
      cnpj: '12345678000190',
      razao_social: 'VOLPE TRANSPORTES LTDA',
      nome_fantasia: 'Volpe Transportes'
    },
    {
      cnpj: '12345678000271',
      razao_social: 'VOLPE LOGISTICA LTDA',
      nome_fantasia: 'Volpe Logística'
    },
    {
      cnpj: '12345678000352',
      razao_social: 'VOLPE ARMAZENAGEM LTDA',
      nome_fantasia: 'Volpe Armazenagem'
    }
  ];
}
