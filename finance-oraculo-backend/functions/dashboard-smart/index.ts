// ===================================================
// Edge Function: dashboard-smart
// API otimizada com sistema de cards e cache inteligente
// ===================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { CardProcessor } from '../common/card-processor.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    // ==================== POST /dashboard-smart ====================
    if (req.method === 'POST') {
      const { cnpj, cards, force_refresh, reference_date, use_llm_planning } = await req.json();

      if (!cnpj || !cards || !Array.isArray(cards)) {
        return new Response(JSON.stringify({
          error: 'Parâmetros inválidos',
          details: 'cnpj (string) e cards (array) são obrigatórios'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const processor = new CardProcessor(supabase);
      const startTime = Date.now();

      // 1. Verificar cache existente
      let cached: Record<string, any> = {};
      let missing: string[] = cards;

      if (!force_refresh) {
        cached = await processor.getCachedCards(cnpj, cards, reference_date);
        missing = cards.filter(c => !cached[c]);

        console.log(`Cache: ${Object.keys(cached).length}/${cards.length} hits`);
      }

      // 2. Se tudo em cache, retornar imediatamente
      if (missing.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          cards: cached,
          source: 'cache',
          cache_hits: Object.keys(cached).length,
          computed: 0,
          duration_ms: Date.now() - startTime,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 3. Agendar cálculo dos cards faltantes
      const { tiers, total, optimized } = await processor.scheduleCards(
        cnpj,
        missing,
        reference_date,
        use_llm_planning !== false // Default true
      );

      console.log(`Scheduled ${total} cards in ${tiers.length} tiers${optimized ? ' (LLM optimized)' : ''}`);

      // 4. Aguardar processamento (com timeout de 30s)
      let computed: Record<string, any> = {};

      try {
        computed = await processor.waitForCards(cnpj, missing, {
          timeout: 30000,
          pollInterval: 500,
          referenceDate: reference_date,
        });
      } catch (error: any) {
        // Timeout ou erro - retornar o que conseguiu
        console.warn('Timeout ou erro no processamento:', error.message);

        // Buscar cards que conseguiram processar
        const partial = await processor.getCachedCards(cnpj, missing, reference_date);

        return new Response(JSON.stringify({
          success: false,
          error: 'Timeout ou erro parcial',
          cards: { ...cached, ...partial },
          source: 'partial',
          cache_hits: Object.keys(cached).length,
          computed: Object.keys(partial).length,
          missing: missing.filter(c => !partial[c]),
          duration_ms: Date.now() - startTime,
        }), {
          status: 206, // Partial Content
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 5. Combinar cache + novos resultados
      const allCards = { ...cached, ...computed };

      return new Response(JSON.stringify({
        success: true,
        cards: allCards,
        source: Object.keys(cached).length > 0 ? 'mixed' : 'computed',
        cache_hits: Object.keys(cached).length,
        computed: Object.keys(computed).length,
        tiers: tiers.length,
        llm_optimized: optimized,
        duration_ms: Date.now() - startTime,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Dashboard smart error:', error);
    return new Response(JSON.stringify({
      error: 'Erro interno',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
