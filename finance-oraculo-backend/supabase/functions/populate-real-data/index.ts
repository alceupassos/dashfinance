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

    const log: any[] = [];

    // 1. Buscar empresas
    const { data: empresas } = await supabase.from('clientes').select('id').limit(3);
    log.push({ step: 'fetch_companies', count: empresas?.length || 0 });

    if (empresas && empresas.length > 0) {
      // 2. Popular DRE entries com dados reais
      const dreEntries = [];
      const accounts = ['Receita Bruta', 'COGS', 'Despesa Adm', 'Despesa Vendas', 'Despesa Financeira'];
      const natures = ['receita', 'custo', 'despesa', 'despesa', 'despesa'];
      
      for (const emp of empresas) {
        for (let day = 1; day <= 30; day += 10) {
          for (let i = 0; i < accounts.length; i++) {
            dreEntries.push({
              company_cnpj: emp.id,
              company_nome: `Empresa ${emp.id.substring(0, 8)}`,
              date: `2025-11-${String(day).padStart(2, '0')}`,
              account: accounts[i],
              nature: natures[i],
              amount: Math.floor(Math.random() * 100000) + 10000
            });
          }
        }
      }

      const { error: dreError } = await supabase.from('dre_entries').insert(dreEntries);
      log.push({ 
        step: 'populate_dre', 
        total: dreEntries.length, 
        status: dreError ? 'error' : 'success',
        error: dreError?.message 
      });

      // 3. Popular Cashflow entries
      const cashflowEntries = [];
      const categories = ['Recebimentos', 'Fornecedores', 'Folha', 'Impostos', 'Aluguel'];
      
      for (const emp of empresas) {
        for (let day = 1; day <= 30; day += 10) {
          for (const category of categories) {
            cashflowEntries.push({
              company_cnpj: emp.id,
              company_nome: `Empresa ${emp.id.substring(0, 8)}`,
              date: `2025-11-${String(day).padStart(2, '0')}`,
              kind: Math.random() > 0.5 ? 'in' : 'out',
              category: category,
              amount: Math.floor(Math.random() * 50000) + 5000
            });
          }
        }
      }

      const { error: cashflowError } = await supabase.from('cashflow_entries').insert(cashflowEntries);
      log.push({ 
        step: 'populate_cashflow', 
        total: cashflowEntries.length, 
        status: cashflowError ? 'error' : 'success',
        error: cashflowError?.message 
      });
    }

    // 4. Verificar Grupo Volpe
    const { data: volpeGroup } = await supabase
      .from('group_aliases')
      .select('id')
      .ilike('label', '%volpe%')
      .maybeSingle();

    log.push({ step: 'check_volpe_group', id: volpeGroup?.id || 'NOT_FOUND' });

    if (volpeGroup) {
      const { data: volpeMembers } = await supabase
        .from('group_alias_members')
        .select('company_cnpj')
        .eq('alias_id', volpeGroup.id);

      log.push({ step: 'volpe_members_count', count: volpeMembers?.length || 0 });
    }

    return new Response(JSON.stringify({ success: true, log }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
