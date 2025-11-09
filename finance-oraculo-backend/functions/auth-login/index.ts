// =====================================================
// Edge Function: auth/login
// Purpose: Autenticar usuário e retornar tokens
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    role: string;
    name?: string;
    avatar_url?: string;
  };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { email, password }: LoginRequest = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email e senha são obrigatórios' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user || !authData.session) {
      console.error('Auth error:', authError);

      // Log failed login attempt as security event
      await supabase.from('admin_security_events').insert({
        severity: 'medium',
        event_type: 'login_failed',
        source: req.headers.get('x-forwarded-for') || 'unknown',
        user_email: email,
        description: `Tentativa de login falhou para ${email}`,
        metadata: { error: authError?.message },
      });

      return new Response(
        JSON.stringify({ error: 'Credenciais inválidas' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name, avatar_url, role, two_factor_enabled')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
    }

    // Create session record
    const userAgent = req.headers.get('user-agent') || '';
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    // Parse device info from user agent (simplified)
    let deviceType = 'desktop';
    let browser = 'unknown';
    let os = 'unknown';

    if (userAgent.toLowerCase().includes('mobile')) {
      deviceType = 'mobile';
    } else if (userAgent.toLowerCase().includes('tablet')) {
      deviceType = 'tablet';
    }

    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    await supabase.from('admin_sessions').insert({
      user_id: authData.user.id,
      user_email: authData.user.email,
      ip_address: ip,
      user_agent: userAgent,
      device_type: deviceType,
      browser: browser,
      os: os,
      status: 'active',
    });

    // Log successful login
    await supabase.from('admin_security_events').insert({
      severity: 'info',
      event_type: 'login_success',
      source: ip,
      user_id: authData.user.id,
      user_email: authData.user.email,
      description: `Login bem-sucedido para ${authData.user.email}`,
      status: 'resolved',
    });

    // Build response
    const response: LoginResponse = {
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      expires_in: authData.session.expires_in || 3600,
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        role: profile?.role || 'viewer',
        name: profile?.name,
        avatar_url: profile?.avatar_url,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
