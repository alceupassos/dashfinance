"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function getSupabaseBrowserClient() {
  if (client) {
    return client;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Tentar ambas as variáveis (anon_key é o nome padrão do Supabase)
  const supabaseKey = 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  // Validação de variáveis
  if (!supabaseUrl || !supabaseKey) {
    console.error("[supabase-browser] Missing environment variables:", {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasPublishableKey: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
      urlValue: supabaseUrl,
    });
    throw new Error("Missing Supabase environment variables - need NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  // Validar formato da URL
  if (!supabaseUrl.startsWith("https://")) {
    console.error("[supabase-browser] Invalid SUPABASE_URL format:", supabaseUrl);
    throw new Error("Invalid Supabase URL format - must start with https://");
  }

  // Validar formato da chave (JWT deve ter 3 partes separadas por pontos)
  const keyParts = supabaseKey.split(".");
  if (keyParts.length !== 3) {
    console.error("[supabase-browser] Invalid SUPABASE_KEY format:", {
      length: supabaseKey.length,
      parts: keyParts.length,
      firstChars: supabaseKey.substring(0, 10) + "...",
      expected: "JWT with 3 parts (xxx.yyy.zzz)"
    });
    throw new Error("Invalid Supabase anon key format - must be a valid JWT (3 parts separated by dots)");
  }
  
  // Log para debug (não expõe a chave completa)
  console.log("[supabase-browser] Key validation passed:", {
    length: supabaseKey.length,
    startsWithEy: supabaseKey.startsWith("ey"),
    parts: keyParts.length
  });

  try {
    client = createBrowserClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    });

    console.log("[supabase-browser] Client created successfully");
    return client;
  } catch (error) {
    console.error("[supabase-browser] Failed to create client:", error);
    throw error;
  }
}

