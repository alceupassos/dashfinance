import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DashboardCard {
  id: string;
  label: string;
  value: number;
  delta?: number;
  suffix?: string;
  caption?: string;
  trend?: 'up' | 'down' | 'flat';
}

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

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const alias = url.searchParams.get('alias');
    const cnpj = url.searchParams.get('cnpj');

    if (!alias && !cnpj) {
      return new Response(JSON.stringify({ error: 'alias ou cnpj é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Query simplificada para retornar cards mockados por enquanto
    // TODO: Implementar query real quando houver dados
    const cards: DashboardCard[] = [
      {
        id: 'receita',
        label: 'Receita',
        value: 1289000,
        delta: 15.4,
        suffix: 'R$',
        caption: 'vs mês anterior',
        trend: 'up'
      },
      {
        id: 'custos',
        label: 'Custos',
        value: 732000,
        delta: -3.1,
        suffix: 'R$',
        caption: 'renegociados',
        trend: 'down'
      },
      {
        id: 'despesas',
        label: 'Despesas',
        value: 254400,
        delta: -1.6,
        suffix: 'R$',
        caption: 'totais despesas',
        trend: 'down'
      },
      {
        id: 'ebitda',
        label: 'EBITDA',
        value: 304600,
        delta: 23.1,
        suffix: 'R$',
        caption: 'melhor para estimado',
        trend: 'up'
      }
    ];

    return new Response(
      JSON.stringify({
        cards,
        generated_at: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in dashboard-cards:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
