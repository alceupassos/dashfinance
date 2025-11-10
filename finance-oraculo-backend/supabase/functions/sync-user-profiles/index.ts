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

    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      throw usersError;
    }

    const results = [];

    for (const user of users || []) {
      const role = ['alceu@angrax.com.br', 'teste@ifin.app.br'].includes(user.email || '') ? 'admin' : 'viewer';
      
      // Tentar atualizar primeiro
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          email: user.email,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
          role: role
        })
        .eq('id', user.id);

      // Se não existir, inserir
      let upsertError = updateError;
      if (updateError) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
            role: role
          });
        upsertError = insertError;
      }

      if (upsertError) {
        results.push({ user: user.email, status: 'error', error: upsertError.message });
      } else {
        results.push({ user: user.email, role: role, status: 'success' });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Synced ${results.filter(r => r.status === 'success').length} profiles`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
