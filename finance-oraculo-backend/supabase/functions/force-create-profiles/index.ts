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
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    const profiles = [
      { id: '6ad14ab1-8b8c-4d23-89d6-7087babd1de4', email: 'teste@ifin.app.br', name: 'Teste', role: 'admin', default_company_cnpj: '2780f5fe-4fd2-4f9e-915d-7dbc9a84c862' },
      { id: '1b43d848-3f28-4b93-aaa5-6faf87c5b389', email: 'alceu@angrax.com.br', name: 'Alceu', role: 'admin', default_company_cnpj: '2780f5fe-4fd2-4f9e-915d-7dbc9a84c862' },
      { id: 'c5193eae-37dc-4285-ab4b-5ccd6bae9d02', email: 'alceupasso@gmail.com', name: 'Alceupasso', role: 'viewer', default_company_cnpj: null }
    ];

    const results = [];
    
    for (const profile of profiles) {
      await supabase.from('profiles').delete().eq('id', profile.id);
      const { error } = await supabase.from('profiles').insert(profile);
      results.push({ id: profile.id, email: profile.email, status: error ? 'error' : 'success', error: error?.message });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
