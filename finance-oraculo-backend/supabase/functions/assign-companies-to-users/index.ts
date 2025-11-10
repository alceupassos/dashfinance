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

    // Buscar usuários teste e alceu via Admin API
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      throw usersError;
    }

    const testeUser = users?.find(u => u.email === 'teste@ifin.app.br');
    const alceuUser = users?.find(u => u.email === 'alceu@angrax.com.br');

    if (!testeUser && !alceuUser) {
      throw new Error('Usuários não encontrados');
    }

    // Buscar algumas empresas para atribuir
    const { data: empresas, error: empresasError } = await supabase
      .from('clientes')
      .select('id, razao_social')
      .limit(10);

    if (empresasError) {
      throw empresasError;
    }

    const results = [];

    // Atribuir empresas ao usuário teste
    if (testeUser && empresas && empresas.length > 0) {
      const assignments = empresas.slice(0, 5).map(emp => ({
        user_id: testeUser.id,
        company_cnpj: emp.id,
        access_level: 'admin'
      }));

      const { error: insertError } = await supabase
        .from('user_companies')
        .insert(assignments);

      if (insertError) {
        console.error('Error assigning to teste:', insertError);
      } else {
        results.push({
          user: 'teste@ifin.app.br',
          companies: assignments.length,
          status: 'success'
        });

        // Atualizar default_company_cnpj no profile
        await supabase
          .from('profiles')
          .update({ default_company_cnpj: empresas[0].id })
          .eq('id', testeUser.id);
      }
    }

    // Atribuir empresas ao usuário alceu
    if (alceuUser && empresas && empresas.length > 0) {
      const assignments = empresas.slice(0, 5).map(emp => ({
        user_id: alceuUser.id,
        company_cnpj: emp.id,
        access_level: 'admin'
      }));

      const { error: insertError } = await supabase
        .from('user_companies')
        .insert(assignments);

      if (insertError) {
        console.error('Error assigning to alceu:', insertError);
      } else {
        results.push({
          user: 'alceu@angrax.com.br',
          companies: assignments.length,
          status: 'success'
        });

        // Atualizar default_company_cnpj no profile
        await supabase
          .from('profiles')
          .update({ default_company_cnpj: empresas[0].id })
          .eq('id', alceuUser.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Assigned companies to ${results.length} users`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
