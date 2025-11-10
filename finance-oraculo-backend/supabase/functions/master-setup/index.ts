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

    // STEP 1: Criar tabela oracle_chat_history via SQL direto
    log.push({ step: 1, action: 'create_oracle_chat_history', status: 'starting' });
    
    const oracleTableSQL = `
      create table if not exists oracle_chat_history (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references auth.users(id) on delete cascade,
        question text not null,
        answer text not null,
        model text not null,
        company_cnpj text,
        created_at timestamptz not null default now()
      );
      create index if not exists idx_oracle_chat_history_user on oracle_chat_history(user_id);
      create index if not exists idx_oracle_chat_history_company on oracle_chat_history(company_cnpj);
      grant select, insert on oracle_chat_history to authenticated;
    `;

    // Executar via admin client (não há exec_sql, então tentamos via insert direto)
    // Como não podemos executar DDL via REST, vamos verificar se existe
    const { error: checkOracle } = await supabase.from('oracle_chat_history').select('id').limit(1);
    log.push({ step: 1, status: checkOracle ? 'table_missing' : 'table_exists', error: checkOracle?.message });

    // STEP 2: Criar tabela oracle_user_settings
    log.push({ step: 2, action: 'create_oracle_user_settings', status: 'starting' });
    const { error: checkSettings } = await supabase.from('oracle_user_settings').select('user_id').limit(1);
    log.push({ step: 2, status: checkSettings ? 'table_missing' : 'table_exists', error: checkSettings?.message });

    // STEP 3: Buscar usuários do auth
    log.push({ step: 3, action: 'fetch_auth_users', status: 'starting' });
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      log.push({ step: 3, status: 'error', error: usersError.message });
    } else {
      const testeUser = users?.find(u => u.email === 'teste@ifin.app.br');
      const alceuUser = users?.find(u => u.email === 'alceu@angrax.com.br');
      
      log.push({ 
        step: 3, 
        status: 'success', 
        users_found: {
          teste: testeUser?.id || 'NOT_FOUND',
          alceu: alceuUser?.id || 'NOT_FOUND'
        }
      });

      // STEP 4: Sincronizar profiles
      if (testeUser || alceuUser) {
        log.push({ step: 4, action: 'sync_profiles', status: 'starting' });
        
        const usersToSync = [testeUser, alceuUser].filter(Boolean);
        
        for (const user of usersToSync) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: user!.id,
              email: user!.email,
              name: user!.email?.split('@')[0],
              role: 'admin',
              default_company_cnpj: '2780f5fe-4fd2-4f9e-915d-7dbc9a84c862'
            }, { onConflict: 'id', ignoreDuplicates: false });
          
          log.push({ 
            step: 4, 
            user: user!.email, 
            status: profileError ? 'error' : 'success',
            error: profileError?.message 
          });
        }
      }

      // STEP 5: Atribuir empresas
      if (testeUser && alceuUser) {
        log.push({ step: 5, action: 'assign_companies', status: 'starting' });
        
        const { data: empresas } = await supabase.from('clientes').select('id').limit(5);
        
        if (empresas) {
          // Limpar empresas antigas
          await supabase.from('user_companies').delete().in('user_id', [testeUser.id, alceuUser.id]);
          
          const assignments = [];
          for (const user of [testeUser, alceuUser]) {
            for (const emp of empresas) {
              assignments.push({
                user_id: user.id,
                company_cnpj: emp.id,
                access_level: 'admin'
              });
            }
          }
          
          const { error: assignError } = await supabase.from('user_companies').insert(assignments);
          log.push({ 
            step: 5, 
            status: assignError ? 'error' : 'success',
            total_assigned: assignments.length,
            error: assignError?.message 
          });
        }
      }
    }

    // STEP 6: Corrigir Grupo Volpe
    log.push({ step: 6, action: 'fix_grupo_volpe', status: 'starting' });
    
    let { data: volpeGroup } = await supabase
      .from('group_aliases')
      .select('id, label')
      .ilike('label', '%volpe%')
      .maybeSingle();

    if (!volpeGroup) {
      const { data: newGroup } = await supabase
        .from('group_aliases')
        .insert({ label: 'Grupo Volpe', description: 'Grupo Volpe', icon: 'building', color: '#3b82f6' })
        .select()
        .single();
      volpeGroup = newGroup;
      log.push({ step: 6, action: 'created_group', id: volpeGroup?.id });
    }

    if (volpeGroup) {
      await supabase.from('group_alias_members').delete().eq('alias_id', volpeGroup.id);
      
      const { data: empresas } = await supabase.from('clientes').select('id, razao_social').limit(5);
      
      if (empresas) {
        const members = empresas.map((emp: any, i: number) => ({
          alias_id: volpeGroup.id,
          company_cnpj: emp.id,
          position: i
        }));
        
        const { error: membersError } = await supabase.from('group_alias_members').insert(members);
        log.push({ 
          step: 6, 
          status: membersError ? 'error' : 'success',
          companies_added: members.length,
          companies: empresas.map((e: any) => e.razao_social),
          error: membersError?.message 
        });
      }
    }

    // STEP 7: Verificação final
    log.push({ step: 7, action: 'final_verification', status: 'starting' });
    
    const { data: finalProfiles } = await supabase
      .from('profiles')
      .select('email, role')
      .in('email', ['teste@ifin.app.br', 'alceu@angrax.com.br']);
    
    const { data: finalCompanies } = await supabase
      .from('user_companies')
      .select('user_id, company_cnpj');
    
    const { data: finalVolpeMembers } = await supabase
      .from('group_alias_members')
      .select('company_cnpj')
      .eq('alias_id', volpeGroup?.id || '');

    log.push({ 
      step: 7, 
      status: 'complete',
      final_state: {
        profiles_with_email: finalProfiles?.length || 0,
        total_user_companies: finalCompanies?.length || 0,
        volpe_members: finalVolpeMembers?.length || 0
      }
    });

    return new Response(JSON.stringify({ success: true, log }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
