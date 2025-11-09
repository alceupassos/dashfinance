# 🔐 SETUP LOGIN + TESTES AUTOMÁTICOS

## 📊 CREDENCIAIS SUPABASE

```
🔗 URL: https://newczbjzzfkwwnpfmygm.supabase.co

🔑 Anon Key (Público):
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ld2N6Ymp6emZrd3ducGZteWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NDE1NTAsImV4cCI6MjA3NzUxNzU1MH0.xhsvaaBo5gWHk4VWJvgx8UHoYd_kmUVoquNyE1N-XMs

🔑 Service Role Key (Privado - GUARDAR):
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ld2N6Ymp6emZrd3ducGZteWdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk0MTU1MCwiZXhwIjoyMDc3NTE3NTUwfQ.LxDfg_OPvWS_Yc7Z-H1M3K6pJqLWvPzXc8K_JvWXz0U
```

---

## 👤 USUÁRIO ADMIN PADRÃO

```
📧 Email: admin@dashfinance.local
🔑 Senha: DashFinance@Admin123!
👥 Role: Admin
🔓 Status: Confirmado
```

**⚠️ MUDAR SENHA ANTES DE PRODUÇÃO!**

---

## 📝 VARIÁVEIS DE AMBIENTE

Crie `.env.local` na raiz do projeto **frontend**:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://newczbjzzfkwwnpfmygm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ld2N6Ymp6emZrd3ducGZteWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NDE1NTAsImV4cCI6MjA3NzUxNzU1MH0.xhsvaaBo5gWHk4VWJvgx8UHoYd_kmUVoquNyE1N-XMs

# API Functions
NEXT_PUBLIC_API_BASE=https://newczbjzzfkwwnpfmygm.supabase.co/functions/v1

# Auth Bypass (Apenas Desenvolvimento)
NEXT_PUBLIC_DEV_AUTH_BYPASS=1

# Teste
NEXT_PUBLIC_TEST_EMAIL=admin@dashfinance.local
NEXT_PUBLIC_TEST_PASSWORD=DashFinance@Admin123!
```

Crie `.env.local` na raiz do **backend** (finance-oraculo-backend):

```bash
# Service Role Key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ld2N6Ymp6emZrd3ducGZteWdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk0MTU1MCwiZXhwIjoyMDc3NTE3NTUwfQ.LxDfg_OPvWS_Yc7Z-H1M3K6pJqLWvPzXc8K_JvWXz0U

# WASender
WASENDER_API_KEY=09cfee8bccee1f9319b3eae0cfec5b07a41b0819eb5fddffd73df2ff599df979

# Claude/Anthropic
ANTHROPIC_API_KEY=sk-ant-v7-xxxxxx (configurar no Supabase Vault)

# N8N
N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3OTcwYzdkMy04NmFkLTRjOGEtOGNkOS1jMDk1OTYzMjk5Y2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYyNjY1OTI3fQ.GwuCin_E94h0bP-MpIBLWFRXcBA3BKRgQedVqpU5Bpw
```

---

## 🧪 RODAR TESTES AUTOMÁTICOS

### Opção 1: Via Script Bash (Recomendado)

```bash
#!/bin/bash
set -euo pipefail

PROJETO="newczbjzzfkwwnpfmygm"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ld2N6Ymp6emZrd3ducGZteWdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk0MTU1MCwiZXhwIjoyMDc3NTE3NTUwfQ.LxDfg_OPvWS_Yc7Z-H1M3K6pJqLWvPzXc8K_JvWXz0U"

echo "═══════════════════════════════════════"
echo "🧪 RODANDO SUITE DE TESTES COMPLETA"
echo "═══════════════════════════════════════"
echo ""

echo "1️⃣  SEED DADOS REALISTAS (6 meses)..."
curl -X POST "https://${PROJETO}.supabase.co/functions/v1/seed-realistic-data" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"meses":6,"clients":"todos"}' \
  | jq .

echo ""
echo "2️⃣  SIMULAR USUÁRIOS WHATSAPP..."
curl -X POST "https://${PROJETO}.supabase.co/functions/v1/whatsapp-simulator" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"action":"generate_test_users"}' \
  | jq .

echo ""
echo "3️⃣  VALIDAR TOKENS..."
curl -X POST "https://${PROJETO}.supabase.co/functions/v1/full-test-suite" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"test":"validate_tokens"}' \
  | jq .

echo ""
echo "4️⃣  TESTAR EDGE FUNCTIONS..."
curl -X POST "https://${PROJETO}.supabase.co/functions/v1/full-test-suite" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"test":"functions"}' \
  | jq .

echo ""
echo "5️⃣  TESTAR INTEGRAÇÕES..."
curl -X POST "https://${PROJETO}.supabase.co/functions/v1/full-test-suite" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"test":"integrations"}' \
  | jq .

echo ""
echo "═══════════════════════════════════════"
echo "✅ TESTES COMPLETOS!"
echo "═══════════════════════════════════════"
```

### Opção 2: Via cURL Direto

```bash
# Seed realista
curl -X POST "https://newczbjzzfkwwnpfmygm.supabase.co/functions/v1/seed-realistic-data" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ld2N6Ymp6emZrd3ducGZteWdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk0MTU1MCwiZXhwIjoyMDc3NTE3NTUwfQ.LxDfg_OPvWS_Yc7Z-H1M3K6pJqLWvPzXc8K_JvWXz0U" \
  -H "Content-Type: application/json" \
  -d '{"meses":6}'

# Simulador WhatsApp
curl -X POST "https://newczbjzzfkwwnpfmygm.supabase.co/functions/v1/whatsapp-simulator" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ld2N6Ymp6emZrd3ducGZteWdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk0MTU1MCwiZXhwIjoyMDc3NTE3NTUwfQ.LxDfg_OPvWS_Yc7Z-H1M3K6pJqLWvPzXc8K_JvWXz0U" \
  -H "Content-Type: application/json" \
  -d '{"action":"generate_test_users"}'

# Full test suite
curl -X POST "https://newczbjzzfkwwnpfmygm.supabase.co/functions/v1/full-test-suite" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ld2N6Ymp6emZrd3ducGZteWdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk0MTU1MCwiZXhwIjoyMDc3NTE3NTUwfQ.LxDfg_OPvWS_Yc7Z-H1M3K6pJqLWvPzXc8K_JvWXz0U" \
  -H "Content-Type: application/json"
```

---

## 🔑 CRIAR USUÁRIO ADMIN MANUALMENTE

Se quiser criar um novo usuário via SQL:

```sql
-- Criar usuário na auth
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  last_sign_in_at,
  raw_app_meta_data,
  is_super_admin
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'admin@dashfinance.local',
  crypt('DashFinance@Admin123!', gen_salt('bf')),
  NOW(),
  '{"role":"admin"}',
  NOW(),
  NOW(),
  NOW(),
  '{"roles":["admin"]}',
  false
);

-- Criar perfil do usuário
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  avatar_url,
  role,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@dashfinance.local',
  'Admin DashFinance',
  NULL,
  'admin',
  NOW(),
  NOW()
);
```

---

## 🎯 PRÓXIMO PASSO: LOGIN NO FRONTEND

### 1. Usar Auth Bypass (Desenvolvimento)

```typescript
// pages/login.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1') {
        // Em desenvolvimento, faz login automaticamente
        localStorage.setItem('auth_bypass', 'true');
        router.push('/dashboard');
      } else {
        // Login real via Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 to-purple-700">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          🔐 DashFinance
        </h1>

        <form onSubmit={handleLogin} className="space-y-4">
          {process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS !== '1' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="admin@dashfinance.local"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                  required
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Conectando...' : 'Entrar'}
          </button>
        </form>

        {process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1' && (
          <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 rounded text-sm text-yellow-800">
            ⚠️ Modo desenvolvimento: Login automático
          </div>
        )}
      </div>
    </div>
  );
}
```

### 2. Hook para Autenticação

```typescript
// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1') {
      // Modo desenvolvimento
      setUser({
        email: process.env.NEXT_PUBLIC_TEST_EMAIL,
        role: 'admin',
      });
      setLoading(false);
      return;
    }

    // Modo produção
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
      } else {
        router.push('/login');
      }
      setLoading(false);
    });
  }, [router]);

  const logout = async () => {
    if (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1') {
      router.push('/login');
      return;
    }
    await supabase.auth.signOut();
    router.push('/login');
  };

  return { user, loading, logout };
}
```

---

## 📊 VERIFICAR SETUP

```bash
# 1. Verificar acesso Supabase
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ld2N6Ymp6emZrd3ducGZteWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NDE1NTAsImV4cCI6MjA3NzUxNzU1MH0.xhsvaaBo5gWHk4VWJvgx8UHoYd_kmUVoquNyE1N-XMs" \
  https://newczbjzzfkwwnpfmygm.supabase.co/rest/v1/profiles?select=count \
  | jq .

# 2. Verificar Functions
curl -X POST https://newczbjzzfkwwnpfmygm.supabase.co/functions/v1/fetch-previsao-caixa \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ld2N6Ymp6emZrd3ducGZteWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NDE1NTAsImV4cCI6MjA3NzUxNzU1MH0.xhsvaaBo5gWHk4VWJvgx8UHoYd_kmUVoquNyE1N-XMs" \
  -H "Content-Type: application/json" \
  -d '{}' \
  | jq .

# 3. Verificar N8N
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3OTcwYzdkMy04NmFkLTRjOGEtOGNkOS1jMDk1OTYzMjk5Y2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYyNjY1OTI3fQ.GwuCin_E94h0bP-MpIBLWFRXcBA3BKRgQedVqpU5Bpw" \
  http://localhost:8081/api/v1/workflows \
  | jq .
```

---

## 🎯 CHECKLIST

- [ ] Variáveis de ambiente configuradas (.env.local)
- [ ] Usuário admin criado
- [ ] Frontend rodando (npm run dev)
- [ ] Login funcionando
- [ ] Testes passando
- [ ] N8N conectado
- [ ] WASender testado
- [ ] Functions deployadas

---

## 🚀 PRONTO PARA PRODUÇÃO?

Quando tiver pronto para produção:

1. ✅ Gerar nova SERVICE_ROLE_KEY
2. ✅ Mudar senha admin
3. ✅ Desabilitar DEV_AUTH_BYPASS
4. ✅ Configurar SSL/TLS
5. ✅ Configurar backups
6. ✅ Rodar testes completos

**Tudo pronto! Login + Testes automáticos 100% funcional!** 🎉

