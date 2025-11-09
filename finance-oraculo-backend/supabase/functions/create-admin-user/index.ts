import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { email, password, fullName } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ erro: "Email e senha são obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`📝 Criando usuário admin: ${email}`);

    // 1. Criar usuário na auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        full_name: fullName || "Admin User",
        role: "admin",
      },
    });

    if (authError) {
      console.error("❌ Erro ao criar usuário auth:", authError);
      return new Response(
        JSON.stringify({ erro: authError.message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Usuário auth criado:", authData.user.id);

    // 2. Criar perfil do usuário
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName || "Admin User",
        role: "admin",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (profileError) {
      console.error("❌ Erro ao criar perfil:", profileError);
      return new Response(
        JSON.stringify({ erro: profileError.message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Perfil criado:", profileData.id);

    return new Response(
      JSON.stringify({
        sucesso: true,
        usuario: {
          id: authData.user.id,
          email: authData.user.email,
          role: "admin",
          criado_em: new Date().toISOString(),
        },
        mensagem: `✅ Usuário admin ${email} criado com sucesso!`,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Erro:", error);
    return new Response(
      JSON.stringify({
        erro: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

