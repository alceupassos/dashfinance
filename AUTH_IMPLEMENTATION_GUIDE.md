# 🔐 GUIA DE AUTENTICAÇÃO - REFERÊNCIA RÁPIDA

> **⚠️ LEIA ISTO SEMPRE QUE IMPLEMENTAR NOVOS USERS OU APIS**

---

## 📋 Checklist Rápido para Implementação

### 1️⃣ Banco de Dados

- [ ] Criar tabela `users` com FK para `auth.users`
- [ ] Adicionar coluna `role` (admin, cliente, franqueado, etc)
- [ ] Adicionar `company_cnpj` para multi-tenant
- [ ] Criar tabela `user_permissions` (resource + action)
- [ ] Criar tabela `user_company_access` (CNPJ level)
- [ ] Criar função `user_has_permission()` (PL/pgSQL)
- [ ] Criar função `user_has_company_access()` (PL/pgSQL)
- [ ] Habilitar RLS: `ALTER TABLE users ENABLE ROW LEVEL SECURITY`
- [ ] Criar policies (SELECT, INSERT, UPDATE, DELETE)
- [ ] Criar índices em colunas-chave

### 2️⃣ Supabase Config

Arquivo: `supabase/config.toml`

```toml
[auth]
enabled = true
site_url = "http://127.0.0.1:3000"
jwt_expiry = 3600                    # 1 hora
enable_refresh_token_rotation = true
enable_signup = true                 # ou false se custom
minimum_password_length = 6
```

### 3️⃣ Edge Function para Usuários

Localização: `supabase/functions/admin-users/index.ts`

**Deve ter**:
```typescript
// 1. Validar JWT
const { data: { user } } = await supabase.auth.getUser(token);

// 2. Verificar se é admin
const { data } = await supabase
  .from('users')
  .select('role')
  .eq('id', user.id)
  .single();

if (data?.role !== 'admin') return 403;

// 3. POST: Criar usuário
const { data: authData } = await supabase.auth.admin.createUser({
  email, password, email_confirm: true
});

await supabase.from('users').insert({
  id: authData.user.id,
  email, full_name, role, company_cnpj
});

// 4. Registrar audit
await supabase.from('audit_log').insert({
  user_id: user.id,
  action: 'create',
  resource_type: 'user',
  resource_id: newUser.id,
  new_value: newUser
});
```

### 4️⃣ Frontend

```typescript
// 1. Login
const { data, error } = await supabase.auth.signInWithPassword({
  email, password
});

// 2. Guardar token
const { session } = await supabase.auth.getSession();
const token = session?.access_token; // localStorage ou state

// 3. Enviar em requisições
const response = await fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// 4. Tratar 401/403
if (response.status === 401) { /* redirect to login */ }
if (response.status === 403) { /* show error: sem permissão */ }
```

---

## 🏗️ Arquitetura Padrão

```
┌─────────────────────────────────┐
│  Supabase Auth (auth.users)     │
│  - Email + password hash        │
│  - JWT generation               │
└──────────────┬──────────────────┘
               │
               ↓
┌─────────────────────────────────┐
│  Custom users table             │
│  - id (FK auth.users)           │
│  - role (admin|cliente|etc)     │
│  - company_cnpj (multi-tenant)  │
│  - status (active|inactive)     │
└──────────────┬──────────────────┘
               │
               ↓
┌─────────────────────────────────┐
│  Permissões Granulares          │
│  - user_permissions             │
│  - user_company_access          │
│  - franchises                   │
│  - RLS policies                 │
└─────────────────────────────────┘
```

---

## 🔒 Segurança em 3 Níveis

### Nível 1: JWT Validation
```
Authorization: Bearer <JWT>
     ↓
Validar assinatura
Verificar expiry
Extrair user_id
```

### Nível 2: RBAC (Role-Based Access Control)
```
SELECT role FROM users WHERE id = $1
     ↓
admin     → Acesso total ✓
cliente   → Apenas sua empresa
franqueado → Sua franquia
```

### Nível 3: RLS (Row Level Security)
```
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own"
  ON users FOR SELECT
  USING (auth.uid() = id);
```

---

## 📝 Template de Migração SQL

```sql
-- migrations/XXX_auth_setup.sql

-- 1. Users
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'cliente', 'franqueado')),
  company_cnpj text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id)
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_company_cnpj ON users(company_cnpj);

-- 2. Permissions
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource text NOT NULL,
  action text NOT NULL CHECK (action IN ('read', 'write', 'delete')),
  UNIQUE(user_id, resource, action)
);

-- 3. Company Access
CREATE TABLE public.user_company_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_cnpj text NOT NULL,
  can_view boolean DEFAULT true,
  can_edit boolean DEFAULT false,
  UNIQUE(user_id, company_cnpj)
);

-- 4. Audit Log
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  new_value jsonb,
  created_at timestamptz DEFAULT now()
);

-- 5. PL/pgSQL Functions
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id uuid, p_resource text, p_action text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_role text;
BEGIN
  SELECT role INTO v_role FROM users WHERE id = p_user_id;
  IF v_role = 'admin' THEN RETURN true; END IF;
  RETURN EXISTS(
    SELECT 1 FROM user_permissions
    WHERE user_id = p_user_id AND resource = p_resource AND action = p_action
  );
END; $$;

-- 6. RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own" ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins manage all" ON users FOR ALL
  USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
```

---

## 🎯 Exemplos de Uso

### Criar Usuário
```bash
POST /admin-users
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "email": "cliente@empresa.com",
  "password": "SecurePass123!",
  "full_name": "João Silva",
  "role": "cliente",
  "company_cnpj": "12345678000123"
}
```

### Login
```bash
POST /auth/sign-in
{
  "email": "user@empresa.com",
  "password": "password"
}
```

### Chamar API com Auth
```bash
GET /api/dados
Authorization: Bearer <token>
```

---

## ⚠️ Erros Comuns

| Erro | Causa | Solução |
|------|-------|---------|
| `401 Unauthorized` | Token inválido/expirado | Refazer login |
| `403 Forbidden` | Sem permissão para resource | Verificar role/permissions |
| `user does not exist` | Criar user no auth.users sem criar em users table | Fazer em uma transação |
| `cannot INSERT with RLS` | RLS policy bloqueando | Adicionar policy de INSERT |
| `duplicate key` | user_id já existe em users | Verificar FK constraint |

---

## 📚 Documentação Completa

Leia também: `docs/AUTH_SOLUTION_EXPLAINED.md`

Contém:
- Arquitetura em detalhes
- Fluxos completos
- Código TypeScript completo
- Diagramas
- Explicação de cada camada

---

## 🚀 Próximos Passos

1. **Se adicionar nova API**:
   - [ ] Verificar se precisa de auth própria
   - [ ] Se sim, seguir este padrão
   - [ ] Criar Edge Function para gerenciar users dessa API
   - [ ] Adicionar RLS para proteger dados

2. **Se adicionar novo Role**:
   - [ ] Adicionar à enum do banco
   - [ ] Criar permissões padrão na função `user_has_permission()`
   - [ ] Documentar acesso padrão do role

3. **Se multi-tenant**:
   - [ ] Usar `company_cnpj` para filtrar dados
   - [ ] Sempre validar acesso com `user_has_company_access()`
   - [ ] Registrar em audit_log

---

## 📞 Referências Rápidas

| Arquivo | O quê |
|---------|-------|
| `migrations/004_auth_and_admin.sql` | Schema completo |
| `supabase/functions/admin-users/` | Edge Function |
| `supabase/config.toml` | Configuração Supabase Auth |
| `docs/AUTH_SOLUTION_EXPLAINED.md` | Documentação detalhada |

---

## ✅ Implementação Checklist

- [ ] Migration criada e rodada
- [ ] RLS habilitado nas tabelas sensíveis
- [ ] Funções PL/pgSQL testadas
- [ ] Edge Function deployada
- [ ] Frontend integrado com auth
- [ ] Testes de 401/403 feitos
- [ ] Audit log funcionando
- [ ] Documentação atualizada

---

**Última Atualização**: 2025-11-09  
**Status**: ✅ Implementado e Testado  
**Próxima Review**: Quando adicionar nova API ou Role

---

⚡ **DICA**: Sempre que implementar novo acesso de usuário, volte aqui e confirme todos os 3 níveis de segurança (JWT, RBAC, RLS).

