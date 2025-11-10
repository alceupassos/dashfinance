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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Execute SQL to fix RLS policies
    const { data, error } = await supabase.rpc('exec', {
      sql: `
        DROP POLICY IF EXISTS profiles_admins_all ON profiles;
        DROP POLICY IF EXISTS profiles_users_own ON profiles;
        
        CREATE POLICY profiles_users_own ON profiles
          FOR ALL 
          USING (auth.uid() = id);
        
        CREATE POLICY profiles_admins_all ON profiles
          FOR SELECT 
          USING (
            (auth.jwt() ->> 'role')::text = 'admin'
            OR
            (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
          );
      `
    });

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, message: 'RLS policies fixed!' }),
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
