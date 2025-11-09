// =====================================================
// Edge Function: profile
// Purpose: GET/PUT perfil do usuário autenticado
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProfileResponse {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: string;
  two_factor_enabled: boolean;
  default_company_cnpj?: string;
  available_companies: string[];
}

interface UpdateProfileRequest {
  name?: string;
  avatar_url?: string;
  default_company_cnpj?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autenticação não fornecido' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ==================== GET PROFILE ====================
    if (req.method === 'GET') {
      // Get profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        return new Response(
          JSON.stringify({ error: 'Erro ao buscar perfil' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Get available companies
      const { data: companies, error: companiesError } = await supabase
        .from('user_companies')
        .select('company_cnpj')
        .eq('user_id', user.id);

      if (companiesError) {
        console.error('Companies error:', companiesError);
      }

      const availableCompanies = companies?.map(c => c.company_cnpj) || [];

      const response: ProfileResponse = {
        id: user.id,
        name: profile.name || '',
        email: profile.email || user.email,
        avatar_url: profile.avatar_url,
        role: profile.role || 'viewer',
        two_factor_enabled: profile.two_factor_enabled || false,
        default_company_cnpj: profile.default_company_cnpj,
        available_companies: availableCompanies,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ==================== UPDATE PROFILE ====================
    if (req.method === 'PUT') {
      const updates: UpdateProfileRequest = await req.json();

      // Validate updates
      const allowedFields = ['name', 'avatar_url', 'default_company_cnpj'];
      const updateData: any = {};

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updateData[key] = value;
        }
      }

      if (Object.keys(updateData).length === 0) {
        return new Response(
          JSON.stringify({ error: 'Nenhum campo válido para atualizar' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Update profile
      updateData.updated_at = new Date().toISOString();

      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Erro ao atualizar perfil' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Get available companies
      const { data: companies } = await supabase
        .from('user_companies')
        .select('company_cnpj')
        .eq('user_id', user.id);

      const availableCompanies = companies?.map(c => c.company_cnpj) || [];

      const response: ProfileResponse = {
        id: user.id,
        name: updatedProfile.name || '',
        email: updatedProfile.email || user.email,
        avatar_url: updatedProfile.avatar_url,
        role: updatedProfile.role || 'viewer',
        two_factor_enabled: updatedProfile.two_factor_enabled || false,
        default_company_cnpj: updatedProfile.default_company_cnpj,
        available_companies: availableCompanies,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Method not allowed
    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Profile error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
