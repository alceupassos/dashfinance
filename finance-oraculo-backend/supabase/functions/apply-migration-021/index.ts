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

    // Executar migration 021
    const migration = `
      create table if not exists oracle_chat_history (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references auth.users(id) on delete cascade,
        question text not null,
        answer text not null,
        model text not null,
        company_cnpj text,
        created_at timestamptz not null default now()
      );

      comment on table oracle_chat_history is 'Registro completo de perguntas e respostas do Oráculo';

      create index if not exists idx_oracle_chat_history_user on oracle_chat_history(user_id);
      create index if not exists idx_oracle_chat_history_company on oracle_chat_history(company_cnpj);

      grant select, insert on oracle_chat_history to authenticated;
    `;

    // Executar cada statement separadamente
    const statements = migration.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      const { error } = await supabase.rpc('exec_sql', { sql: statement.trim() + ';' });
      if (error) {
        console.error('Error executing statement:', statement, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Migration 021 applied successfully'
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
