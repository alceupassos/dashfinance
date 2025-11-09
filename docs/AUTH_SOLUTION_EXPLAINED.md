# 🔐 Solução Completa de Autenticação no Supabase

## Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Componentes](#componentes)
4. [Fluxo de Autenticação](#fluxo-de-autenticação)
5. [Fluxo de Autorização](#fluxo-de-autorização)
6. [Implementação Passo a Passo](#implementação-passo-a-passo)
7. [Código de Exemplo](#código-de-exemplo)

---

## Visão Geral

A solução de autenticação implementada no projeto utiliza:

- **Supabase Auth**: Para gerenciamento nativo de usuários, emails e senhas
- **Tabela Custom Users**: Para armazenar roles, permissões e dados adicionais
- **Row Level Security (RLS)**: Para proteção de dados no banco
- **PL/pgSQL Functions**: Para validações de autorização
- **Edge Functions**: Para APIs de gerenciamento de usuários

**Resultado**: Um sistema seguro, escalável e multi-tenant.

---

## Arquitetura

### Camada 1: Supabase Auth (Built-in)

```
┌─────────────────────────────────────────────────┐
│          auth.users (Supabase)                  │
├─────────────────────────────────────────────────┤
│ • id (uuid)                                     │
│ • email (unique, verificado)                    │
│ • encrypted_password                            │
│ • email_confirmed_at                            │
│ • raw_user_meta_data (JSON)                     │
│ • aud = 'authenticated' | 'anon'                │
│ • created_at, updated_at                        │
│                                                  │
│ ✓ JWT gerado automaticamente                    │
│ ✓ Refresh tokens com rotação                    │
│ ✓ Magic links / OTP                             │
└─────────────────────────────────────────────────┘
```

**Configuração** (`supabase/config.toml`):
```toml
[auth]
enabled = true
site_url = "http://127.0.0.1:3000"
jwt_expiry = 3600                        # 1 hora
enable_refresh_token_rotation = true
enable_signup = true
minimum_password_length = 6
```

### Camada 2: Tabela Users (Custom)

```sql
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  avatar_url text,
  
  -- ROLE: Define nível de acesso
  role text NOT NULL CHECK (role IN (
    'admin',              -- Acesso total
    'executivo_conta',    -- Acesso a empresas atribuídas
    'franqueado',         -- Acesso a franquia
    'cliente',            -- Acesso a 1 empresa específica
    'viewer'              -- Apenas leitura
  )),
  
  -- EMPRESA: para clientes (multi-tenant)
  company_cnpj text,
  
  -- STATUS: para suspender acessos
  status text NOT NULL DEFAULT 'active' CHECK (status IN (
    'active',
    'inactive',
    'suspended'
  )),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_login_at timestamptz,
  created_by uuid REFERENCES users(id),
  
  -- Constraint: cliente deve ter CNPJ
  CONSTRAINT check_cliente_has_company CHECK (
    (role = 'cliente' AND company_cnpj IS NOT NULL) 
    OR role != 'cliente'
  )
);

-- Índices para performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_company_cnpj ON users(company_cnpj);
```

### Camada 3: Autorização (Permissões Granulares)

#### Tabela: user_permissions
```sql
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  resource text NOT NULL,  -- 'clients', 'templates', 'reports', 'whatsapp'
  action text NOT NULL CHECK (action IN ('read', 'write', 'delete', 'execute')),
  
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, resource, action)
);
```

#### Tabela: user_company_access
```sql
CREATE TABLE public.user_company_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_cnpj text NOT NULL,
  company_nome text NOT NULL,
  
  -- Níveis de acesso
  can_view boolean DEFAULT true,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  
  granted_at timestamptz DEFAULT now(),
  granted_by uuid REFERENCES users(id),
  
  UNIQUE(user_id, company_cnpj)
);
```

#### Tabela: franchises (para franqueados)
```sql
CREATE TABLE public.franchises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_user_id uuid NOT NULL REFERENCES users(id),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.franchise_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
  company_cnpj text NOT NULL,
  company_nome text NOT NULL,
  added_at timestamptz DEFAULT now(),
  UNIQUE(franchise_id, company_cnpj)
);
```

---

## Componentes

### 1. Funções PL/pgSQL para Autorização

#### user_has_permission()
```sql
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id uuid,
  p_resource text,
  p_action text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
  v_has_permission boolean;
BEGIN
  -- Admin tem tudo
  SELECT role INTO v_role FROM users WHERE id = p_user_id;
  
  IF v_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Verificar permissão explícita
  SELECT EXISTS(
    SELECT 1 FROM user_permissions
    WHERE user_id = p_user_id
      AND resource = p_resource
      AND action = p_action
  ) INTO v_has_permission;
  
  RETURN v_has_permission;
END;
$$;
```

#### user_has_company_access()
```sql
CREATE OR REPLACE FUNCTION user_has_company_access(
  p_user_id uuid,
  p_company_cnpj text,
  p_access_type text DEFAULT 'view'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
  v_user_company text;
  v_has_access boolean;
BEGIN
  SELECT role, company_cnpj INTO v_role, v_user_company
  FROM users WHERE id = p_user_id;
  
  -- Admin: acesso total
  IF v_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Cliente: apenas sua empresa, apenas view
  IF v_role = 'cliente' THEN
    RETURN (v_user_company = p_company_cnpj) AND (p_access_type = 'view');
  END IF;
  
  -- Franqueado: sua franquia
  IF v_role = 'franqueado' THEN
    SELECT EXISTS(
      SELECT 1 FROM franchise_companies fc
      JOIN franchises f ON f.id = fc.franchise_id
      WHERE f.owner_user_id = p_user_id
        AND fc.company_cnpj = p_company_cnpj
    ) INTO v_has_access;
    RETURN v_has_access;
  END IF;
  
  -- Outros: acesso explícito via user_company_access
  IF p_access_type = 'view' THEN
    SELECT can_view INTO v_has_access FROM user_company_access
    WHERE user_id = p_user_id AND company_cnpj = p_company_cnpj;
  ELSIF p_access_type = 'edit' THEN
    SELECT can_edit INTO v_has_access FROM user_company_access
    WHERE user_id = p_user_id AND company_cnpj = p_company_cnpj;
  END IF;
  
  RETURN COALESCE(v_has_access, false);
END;
$$;
```

### 2. Row Level Security (RLS)

```sql
-- Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Usuário vê seu próprio perfil
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Policy: Admin vê todos
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admin gerencia usuários
CREATE POLICY "Admins can manage users"
  ON users FOR ALL
  USING (
    EXISTS(
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### 3. Edge Function: admin-users

**Localização**: `finance-oraculo-backend/supabase/functions/admin-users/index.ts`

**Endpoints**:

```typescript
// GET: Listar usuários
GET /admin-users?role=admin&status=active

// GET: Buscar específico
GET /admin-users?userId=<uuid>

// POST: Criar novo usuário
POST /admin-users
{
  "email": "user@example.com",
  "password": "secure_password",
  "full_name": "User Name",
  "role": "cliente",
  "company_cnpj": "12345678000123"
}

// PUT: Atualizar usuário
PUT /admin-users/<uuid>
{
  "role": "executivo_conta",
  "status": "inactive"
}

// DELETE: Deletar usuário
DELETE /admin-users/<uuid>
```

---

## Fluxo de Autenticação

### 1️⃣ Login

```
┌─────────────────┐
│   Cliente       │
│  (Browser)      │
└────────┬────────┘
         │
         │ 1. POST /auth/sign-in
         │    { email, password }
         ↓
┌─────────────────────────────┐
│   Supabase Auth             │
│  (auth.users)               │
└─────────┬───────────────────┘
          │
          │ 2. Valida email/password
          │    Hash verificado ✓
          │
          │ 3. Gera JWT
          ↓
┌──────────────────────────────────────────┐
│        JWT Token gerado:                 │
│  {                                       │
│    "sub": "user_id",                     │
│    "email": "user@example.com",          │
│    "aud": "authenticated",               │
│    "exp": 1234567890,                    │
│    "iat": 1234567800                     │
│  }                                       │
└──────────────────────────────────────────┘
          │
          │ 4. Retorna JWT + Refresh Token
          ↓
┌─────────────────┐
│   Cliente       │
│  localStorage:  │
│  - access_token │
│  - refresh_token│
│  - user_id      │
└─────────────────┘
```

### 2️⃣ Requisições Subsequentes

```
┌─────────────────────────────────┐
│    Cliente                      │
│  GET /api/admin-users           │
│  Authorization: Bearer <JWT>    │
└─────────────┬───────────────────┘
              │
              ↓
┌────────────────────────────────┐
│   Edge Function                │
│                                │
│ 1. Lê header Authorization     │
│ 2. Extrai JWT                  │
│ 3. Valida assinatura           │
│ 4. Extrai user_id              │
└─────────┬──────────────────────┘
          │
          ↓
┌────────────────────────────────┐
│   Busca permissões             │
│                                │
│ SELECT role, status            │
│ FROM users                      │
│ WHERE id = $1                   │
└─────────┬──────────────────────┘
          │
          ├─ role = 'admin' ? ✓ Continua
          │
          ├─ role = 'cliente' ?
          │  ↓ Valida company_cnpj
          │
          ├─ role = 'franqueado' ?
          │  ↓ Valida franchise
          │
          └─ Sem permissão ? 403 Forbidden
```

---

## Fluxo de Autorização

```
┌──────────────────────────────┐
│  Requisição validada ✓       │
│  (JWT, user_id conhecida)    │
└────────────┬─────────────────┘
             │
             ↓
┌──────────────────────────────┐
│ 1. Identificar RESOURCE      │
│    (clients, templates,      │
│     reports, whatsapp)       │
└────────────┬─────────────────┘
             │
             ↓
┌──────────────────────────────┐
│ 2. Identificar ACTION        │
│    (read, write, delete,     │
│     execute)                 │
└────────────┬─────────────────┘
             │
             ↓
┌──────────────────────────────┐
│ 3. Chamar função:            │
│    user_has_permission(      │
│      user_id,                │
│      resource,               │
│      action                  │
│    )                         │
└────────────┬─────────────────┘
             │
             ├─ Admin ? → TRUE ✓
             │
             ├─ user_permissions
             │  entry ? → TRUE ✓
             │
             ├─ Nenhum ? → FALSE ✗
             │
             ↓
┌──────────────────────────────┐
│ 4. Resultado:                │
│    - TRUE → Continua         │
│    - FALSE → 403 Forbidden   │
└──────────────────────────────┘
```

---

## Implementação Passo a Passo

### Passo 1: Criar Migração

```sql
-- migrations/004_auth_and_admin.sql

-- 1. Tabela users
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- ... colunas ...
);

-- 2. Tabelas de permissões
CREATE TABLE public.user_permissions (
  -- ... colunas ...
);

CREATE TABLE public.user_company_access (
  -- ... colunas ...
);

-- 3. Funções de autorização
CREATE OR REPLACE FUNCTION user_has_permission(...) ...
CREATE OR REPLACE FUNCTION user_has_company_access(...) ...

-- 4. RLS policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ...
```

### Passo 2: Configurar Auth no config.toml

```toml
[auth]
enabled = true
site_url = "http://127.0.0.1:3000"
jwt_expiry = 3600
enable_refresh_token_rotation = true
enable_signup = true
minimum_password_length = 6
```

### Passo 3: Criar Edge Function

```typescript
// supabase/functions/admin-users/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

async function isAdmin(userId: string) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  return data?.role === 'admin';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    // Extrair JWT do header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // Validar JWT
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é admin para POST/PUT/DELETE
    const isAdminUser = await isAdmin(user.id);
    if (!isAdminUser && req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Acesso negado' }),
        { status: 403, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // Handle GET, POST, PUT, DELETE...
    if (req.method === 'POST') {
      const { email, password, full_name, role, company_cnpj } = await req.json();

      // Validar
      if (!email || !password || !full_name || !role) {
        return new Response(
          JSON.stringify({ error: 'Campos obrigatórios faltando' }),
          { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        );
      }

      // Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError) throw authError;

      // Criar registro na tabela users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          full_name,
          role,
          company_cnpj: role === 'cliente' ? company_cnpj : null,
          created_by: user.id,
        })
        .select()
        .single();

      if (userError) throw userError;

      return new Response(
        JSON.stringify(userData),
        { status: 201, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // ... outros métodos ...

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    );
  }
});
```

### Passo 4: Frontend Integration

```typescript
// lib/auth.ts

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export function getAuthToken() {
  // Pega do localStorage
  const session = supabase.auth.getSession();
  return session?.access_token;
}
```

```typescript
// components/AdminUsers.tsx

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      
      // Pegar token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Chamar Edge Function
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-users`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Falha ao buscar usuários');
      }

      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Nome</th>
              <th>Role</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{user.full_name}</td>
                <td>{user.role}</td>
                <td>{user.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

---

## Código de Exemplo

### Criar Novo Usuário (Admin)

```bash
curl -X POST "http://localhost:54321/functions/v1/admin-users" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cliente@empresa.com",
    "password": "SecurePassword123!",
    "full_name": "João Silva",
    "role": "cliente",
    "company_cnpj": "12345678000123"
  }'
```

### Listar Usuários (Admin)

```bash
curl "http://localhost:54321/functions/v1/admin-users?role=admin" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Atualizar Usuário (Admin)

```bash
curl -X PUT "http://localhost:54321/functions/v1/admin-users/user_id" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "executivo_conta",
    "status": "active"
  }'
```

---

## Resumo

| Aspecto | Solução |
|---------|---------|
| **Armazenamento de Usuários** | Supabase Auth (auth.users) + Custom users table |
| **Senhas** | Hash pgcrypto (Supabase) |
| **Tokens** | JWT com expiry de 1h + refresh tokens |
| **Roles** | 5 tipos: admin, executivo_conta, franqueado, cliente, viewer |
| **Multi-tenant** | Via company_cnpj na tabela users |
| **Permissões** | Tabelas user_permissions + user_company_access |
| **Segurança** | RLS policies + PL/pgSQL functions + JWT validation |
| **Escalabilidade** | Índices em todas as chaves importantes |
| **Auditoria** | Tabela audit_log registra ações |

---

**Arquivo de Referência**: `finance-oraculo-backend/migrations/004_auth_and_admin.sql`

