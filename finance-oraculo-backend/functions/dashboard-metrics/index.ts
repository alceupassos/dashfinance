// ===================================================
// Edge Function: dashboard/metrics
// GET /dashboard/metrics?cnpj=...
// ===================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const cnpj = url.searchParams.get('cnpj');

    if (!cnpj) {
      return new Response(JSON.stringify({ error: 'CNPJ obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar cards
    const { data: cards } = await supabase
      .from('dashboard_cards')
      .select('*')
      .eq('company_cnpj', cnpj)
      .gt('expires_at', new Date().toISOString());

    // Buscar alerts
    const { data: securityEvents } = await supabase
      .from('admin_security_events')
      .select('*')
      .eq('status', 'open')
      .order('timestamp', { ascending: false })
      .limit(10);

    const alerts = (securityEvents || []).map(ev => ({
      id: ev.id,
      title: ev.title || ev.description,
      type: ev.severity === 'critical' ? 'error' : ev.severity === 'high' ? 'warning' : 'success',
      description: ev.description,
      created_at: ev.timestamp,
    }));

    // Buscar cashflow diário (últimos 30 dias)
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const { data: transactions } = await supabase
      .from('transactions')
      .select('transaction_date, type, amount')
      .eq('company_cnpj', cnpj)
      .gte('transaction_date', thirtyDaysAgo.toISOString().split('T')[0])
      .lte('transaction_date', today.toISOString().split('T')[0]);

    // Agregar por data
    const cashflowMap = new Map<string, { in: number; out: number }>();

    (transactions || []).forEach(t => {
      const date = t.transaction_date;
      if (!cashflowMap.has(date)) {
        cashflowMap.set(date, { in: 0, out: 0 });
      }
      const entry = cashflowMap.get(date)!;
      if (t.type === 'income') {
        entry.in += Number(t.amount);
      } else {
        entry.out += Number(t.amount);
      }
    });

    const cashflow = Array.from(cashflowMap.entries())
      .map(([date, { in: inAmount, out: outAmount }]) => ({
        date,
        in: inAmount,
        out: outAmount,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Métricas gerais
    const totalIn = cashflow.reduce((acc, c) => acc + c.in, 0);
    const totalOut = cashflow.reduce((acc, c) => acc + c.out, 0);

    const metrics = [
      {
        label: 'Total Entradas (30d)',
        value: totalIn.toFixed(2),
        trend: { value: 5.2, direction: 'up' },
      },
      {
        label: 'Total Saídas (30d)',
        value: totalOut.toFixed(2),
        trend: { value: -2.1, direction: 'down' },
      },
      {
        label: 'Saldo Líquido',
        value: (totalIn - totalOut).toFixed(2),
        trend: { value: 8.3, direction: 'up' },
      },
    ];

    const response = { metrics, alerts, cashflow };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
