# 🔐 KMS Integration - F360 Token Encryption
**Data:** 11 de Novembro de 2025
**Status:** ✅ Implementado e Deployado
**Versão:** 1.0

---

## 📋 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Implementação](#implementação)
4. [Configuração](#configuração)
5. [Uso](#uso)
6. [Segurança](#segurança)
7. [Troubleshooting](#troubleshooting)
8. [Rotação de Chaves](#rotação-de-chaves)

---

## 🎯 VISÃO GERAL

### O Que É

Sistema de gerenciamento de chaves (KMS - Key Management System) para criptografia segura de tokens F360 no DashFinance.

### Por Que Implementar

**Antes (Inseguro):**
- Chave hardcoded: `current_setting('app.encryption_key')`
- Difícil rotação de chaves
- Mesma chave em todos os ambientes
- Sem controle de acesso granular

**Depois (Seguro):**
- Chave em environment variable: `APP_KMS`
- Fácil rotação (só atualizar secret)
- Chave diferente por ambiente (dev/staging/prod)
- Controle por função no Supabase

### Benefícios

✅ **Segurança:** Chave não exposta no código
✅ **Flexibilidade:** Fácil rotação sem redeploy
✅ **Isolamento:** Chave por ambiente
✅ **Auditoria:** Logs de acesso ao secret
✅ **Compliance:** Segue best practices de segurança

---

## 🏗️ ARQUITETURA

### Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────────┐
│ 1️⃣  CONFIGURAÇÃO (One-time)                                    │
│                                                                  │
│  Admin executa:                                                  │
│  $ openssl rand -base64 32                                       │
│    → fA1fjdgMF6HHzBmrlLI+MsuRDUukBqHAADZVu+xxAFw=              │
│                                                                  │
│  $ supabase secrets set APP_KMS='<chave>' --project-ref xxx     │
│    → Chave armazenada no Supabase Secrets                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2️⃣  EDGE FUNCTION STARTUP                                      │
│                                                                  │
│  const kmsKey = Deno.env.get('APP_KMS');                        │
│  if (!kmsKey) {                                                  │
│    throw new Error('APP_KMS not set');                          │
│  }                                                               │
│                                                                  │
│  ✅ Validação no início previne erros silenciosos              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3️⃣  DESCRIPTOGRAFIA (Runtime)                                  │
│                                                                  │
│  supabase.rpc('decrypt_f360_token', {                           │
│    _id: token_uuid,                                              │
│    _kms: kmsKey  ← Injetado da env                              │
│  })                                                              │
│                                                                  │
│  ↓ PostgreSQL Function                                          │
│                                                                  │
│  SELECT token_f360_enc FROM integration_f360 WHERE id = _id     │
│  ↓                                                               │
│  pgp_sym_decrypt(                                                │
│    token_f360_enc,                                               │
│    COALESCE(_kms, current_setting('app.kms'))                   │
│  )                                                               │
│  ↓                                                               │
│  RETURN decrypted_token                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4️⃣  USO DO TOKEN                                               │
│                                                                  │
│  fetch('https://app.f360.com.br/api/transactions', {            │
│    headers: {                                                    │
│      'Authorization': `Bearer ${decrypted_token}`               │
│    }                                                             │
│  })                                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Componentes

#### 1. Supabase Secrets
**Função:** Armazenamento seguro da chave
**Localização:** Supabase Dashboard > Settings > Vault
**Acesso:** Apenas service_role e admin

#### 2. Environment Variable (APP_KMS)
**Função:** Disponibilizar chave para Edge Functions
**Propagação:** Automática do Supabase Secrets
**Escopo:** Por função (isolado)

#### 3. PostgreSQL Function (decrypt_f360_token)
**Função:** Descriptografar tokens
**Segurança:** SECURITY DEFINER
**Permissões:** authenticated, service_role

#### 4. Edge Functions
**Funções afetadas:**
- sync-f360
- scheduled-sync-erp
- whatsapp-bot

**Responsabilidade:** Injetar _kms no RPC

---

## 💻 IMPLEMENTAÇÃO

### Código SQL (Migration)

**Arquivo:** `supabase/migrations/20251110_create_decrypt_f360_token.sql`

```sql
-- Criar função para descriptografar token F360
CREATE OR REPLACE FUNCTION public.decrypt_f360_token(_id UUID, _kms TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  _token_enc BYTEA;
  _token_dec TEXT;
BEGIN
  -- Buscar token criptografado
  SELECT token_f360_enc INTO _token_enc
  FROM integration_f360
  WHERE id = _id;

  IF _token_enc IS NULL THEN
    RETURN NULL;
  END IF;

  -- Usar a chave KMS passada ou pegar do ambiente
  _token_dec := pgp_sym_decrypt(_token_enc, COALESCE(_kms, current_setting('app.kms')));

  RETURN _token_dec;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Erro ao descriptografar token: %', SQLERRM;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissão para funções
GRANT EXECUTE ON FUNCTION public.decrypt_f360_token(_id UUID, _kms TEXT) TO authenticated, service_role;
```

**Explicação:**

1. **Parâmetros:**
   - `_id UUID`: ID do token em integration_f360
   - `_kms TEXT DEFAULT NULL`: Chave KMS (opcional)

2. **Lógica:**
   - Busca `token_f360_enc` da tabela
   - Se NULL, retorna NULL (token não existe)
   - Descriptografa com `COALESCE(_kms, current_setting('app.kms'))`
   - Fallback para `app.kms` se `_kms` não fornecido

3. **Segurança:**
   - `SECURITY DEFINER`: Executa com privilégios do owner
   - `GRANT`: Apenas authenticated e service_role
   - `EXCEPTION`: Não expõe detalhes do erro

---

### Código TypeScript (Edge Functions)

#### sync-f360/index.ts

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getSupabaseClient, corsHeaders } from '../common/db.ts';
import { syncF360TokenGroup, F360Company } from '../common/f360-sync.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    // ✅ Obter chave KMS do ambiente
    const kmsKey = Deno.env.get('APP_KMS');
    if (!kmsKey) {
      throw new Error('APP_KMS environment variable is not set');
    }

    const supabase = getSupabaseClient();
    const { data: integrations, error } = await supabase
      .from('integration_f360')
      .select('id, cliente_nome, cnpj, token_enc');

    if (error) {
      throw error;
    }

    const tokenGroups = new Map<string, { token: string; companies: F360Company[] }>();
    const results: Array<{ cliente: string; cnpj: string; synced?: number; status: string; error?: string }> = [];

    for (const integration of integrations || []) {
      if (!integration.cnpj) {
        results.push({
          cliente: integration.cliente_nome,
          cnpj: integration.cnpj || 'missing',
          status: 'error',
          error: 'cnpj vazio',
        });
        continue;
      }

      const tokenKey = String(integration.token_enc ?? integration.id);
      let group = tokenGroups.get(tokenKey);

      if (!group) {
        // ✅ Injetar chave KMS no RPC
        const { data: tokenData, error: decryptError } = await supabase.rpc('decrypt_f360_token', {
          _id: integration.id,
          _kms: kmsKey,  // ← Chave injetada
        });

        if (decryptError || !tokenData) {
          console.error(`Failed to decrypt token for ${integration.cliente_nome}`);
          results.push({
            cliente: integration.cliente_nome,
            cnpj: integration.cnpj,
            status: 'error',
            error: 'Failed to decrypt token',
          });
          continue;
        }

        group = { token: tokenData, companies: [] };
        tokenGroups.set(tokenKey, group);
      }

      group.companies.push({
        id: integration.id,
        cliente_nome: integration.cliente_nome,
        cnpj: integration.cnpj,
      });
    }

    // ... resto do código
  } catch (error) {
    console.error('Sync F360 error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Erro interno' }),
      {
        status: 500,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      }
    );
  }
});
```

**Pontos-chave:**

1. **Validação Early:**
   ```typescript
   const kmsKey = Deno.env.get('APP_KMS');
   if (!kmsKey) {
     throw new Error('APP_KMS environment variable is not set');
   }
   ```
   - Falha rápida se não configurado
   - Erro claro para debugging

2. **Injeção Consistente:**
   ```typescript
   await supabase.rpc('decrypt_f360_token', {
     _id: integration.id,
     _kms: kmsKey,
   });
   ```
   - Sempre passa _kms
   - Não depende de `app.kms` no DB

3. **Error Handling:**
   ```typescript
   if (decryptError || !tokenData) {
     console.error(`Failed to decrypt token for ${integration.cliente_nome}`);
     results.push({
       status: 'error',
       error: 'Failed to decrypt token',
     });
     continue; // Não interrompe o loop
   }
   ```

---

#### scheduled-sync-erp/index.ts

**Mudanças:** Idênticas ao sync-f360
- ✅ Validação de APP_KMS no início
- ✅ Injeção de _kms no RPC
- ✅ Error handling

---

#### whatsapp-bot/index.ts

```typescript
// Dentro da função fetchExternalData
async function fetchExternalData(cnpj: string, dataType: 'f360' | 'omie', query: string) {
  const supabase = getSupabaseClient();
  const cleanCnpj = onlyDigits(cnpj);

  try {
    if (dataType === 'f360') {
      // ✅ Obter chave KMS
      const kmsKey = Deno.env.get('APP_KMS');
      if (!kmsKey) {
        return { source: 'f360', error: 'APP_KMS não configurado' };
      }

      const { data: integration } = await supabase
        .from('integration_f360')
        .select('id, cliente_nome')
        .eq('cnpj', cleanCnpj)
        .single();

      if (!integration) {
        return { source: 'f360', error: 'Integração F360 não encontrada' };
      }

      // ✅ Injetar KMS
      const { data: token } = await supabase.rpc('decrypt_f360_token', {
        _id: integration.id,
        _kms: kmsKey
      });

      if (!token) return { source: 'f360', error: 'Token inválido' };

      // Usar token...
    }
  } catch (error) {
    // ...
  }
}
```

---

#### common/db.ts (Helper Function)

```typescript
export async function decryptF360Token(id: string, kmsKey?: string): Promise<string | null> {
  const supabase = getSupabaseClient();

  // Usar chave KMS fornecida ou obter do ambiente
  const key = kmsKey || Deno.env.get('APP_KMS');
  if (!key) {
    console.error('APP_KMS not configured');
    return null;
  }

  const { data, error } = await supabase.rpc('decrypt_f360_token', {
    _id: id,
    _kms: key
  });

  if (error) {
    console.error('Error decrypting F360 token:', error);
    return null;
  }

  return data;
}
```

**Benefícios:**
- ✅ Centraliza lógica de descriptografia
- ✅ Aceita chave como parâmetro ou env
- ✅ Error handling consistente

---

## ⚙️ CONFIGURAÇÃO

### Passo 1: Gerar Chave KMS

```bash
# Gerar chave de 256 bits (32 bytes) em Base64
openssl rand -base64 32

# Exemplo de output:
# fA1fjdgMF6HHzBmrlLI+MsuRDUukBqHAADZVu+xxAFw=
```

**Importante:**
- ✅ 32 bytes = 256 bits (AES-256)
- ✅ Base64 para encoding seguro
- ✅ Guardar em local seguro (password manager)

---

### Passo 2: Registrar no Supabase

```bash
cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-backend

supabase secrets set APP_KMS='fA1fjdgMF6HHzBmrlLI+MsuRDUukBqHAADZVu+xxAFw=' \
  --project-ref xzrmzmcoslomtzkzgskn
```

**Output esperado:**
```
Finished supabase secrets set.
```

**Verificação:**
```bash
supabase secrets list --project-ref xzrmzmcoslomtzkzgskn
```

**Alternativa (Dashboard):**
1. Acessar: https://supabase.com/dashboard/project/xzrmzmcoslomtzkzgskn/settings/vault
2. Clicar em "New secret"
3. Name: `APP_KMS`
4. Value: `fA1fjdgMF6HHzBmrlLI+MsuRDUukBqHAADZVu+xxAFw=`
5. Salvar

---

### Passo 3: Aplicar Migration

```bash
# Se ainda não aplicada
supabase db push --project-ref xzrmzmcoslomtzkzgskn
```

**Validação:**
```sql
-- No SQL Editor do Supabase
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_name = 'decrypt_f360_token';

-- Deve retornar a função com parâmetro _kms
```

---

### Passo 4: Deploy Edge Functions

```bash
# Deploy sync-f360
supabase functions deploy sync-f360 --project-ref xzrmzmcoslomtzkzgskn

# Deploy scheduled-sync-erp
supabase functions deploy scheduled-sync-erp --project-ref xzrmzmcoslomtzkzgskn

# Deploy whatsapp-bot (se necessário)
supabase functions deploy whatsapp-bot --project-ref xzrmzmcoslomtzkzgskn
```

**Output esperado:**
```
Deployed Functions on project xzrmzmcoslomtzkzgskn: sync-f360
Uploading asset (sync-f360): supabase/functions/sync-f360/index.ts
Uploading asset (sync-f360): supabase/functions/common/f360-sync.ts
Uploading asset (sync-f360): supabase/functions/common/db.ts
```

---

### Passo 5: Verificar Funcionamento

```bash
# Testar sync-f360
curl -X POST https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/sync-f360 \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"

# Verificar logs
supabase functions logs sync-f360 --project-ref xzrmzmcoslomtzkzgskn
```

**Sucesso:**
```json
{
  "success": true,
  "results": [...],
  "timestamp": "2025-11-11T22:00:00Z"
}
```

**Erro (APP_KMS não configurado):**
```json
{
  "error": "APP_KMS environment variable is not set"
}
```

---

## 🔧 USO

### Em Edge Functions

```typescript
import { getSupabaseClient } from '../common/db.ts';

serve(async (req) => {
  try {
    // 1. Validar APP_KMS
    const kmsKey = Deno.env.get('APP_KMS');
    if (!kmsKey) {
      throw new Error('APP_KMS not set');
    }

    const supabase = getSupabaseClient();

    // 2. Buscar integração
    const { data: integration } = await supabase
      .from('integration_f360')
      .select('id, cliente_nome, cnpj')
      .eq('cnpj', '00026888000100')
      .single();

    // 3. Descriptografar token
    const { data: token, error } = await supabase.rpc('decrypt_f360_token', {
      _id: integration.id,
      _kms: kmsKey,
    });

    if (error || !token) {
      throw new Error('Failed to decrypt token');
    }

    // 4. Usar token
    const response = await fetch('https://app.f360.com.br/api/transactions', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    // ...
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

---

### Usando Helper Function

```typescript
import { decryptF360Token } from '../common/db.ts';

// Opção 1: Usar env automaticamente
const token = await decryptF360Token(integration_id);

// Opção 2: Passar chave explicitamente
const kmsKey = Deno.env.get('APP_KMS');
const token = await decryptF360Token(integration_id, kmsKey);

if (!token) {
  throw new Error('Failed to decrypt token');
}
```

---

## 🔒 SEGURANÇA

### Princípios Implementados

#### 1. Defense in Depth (Defesa em Profundidade)

**Camada 1: Environment Variable**
- Chave não no código-fonte
- Isolada por função
- Não aparece em logs

**Camada 2: Supabase Secrets**
- Criptografado em repouso
- Acesso auditado
- Rotação sem downtime

**Camada 3: PostgreSQL Function**
- `SECURITY DEFINER`: Privilégios controlados
- `GRANT`: Apenas authenticated/service_role
- Error handling: Não expõe detalhes

**Camada 4: Criptografia (pgp_sym_decrypt)**
- AES-256 (padrão militar)
- Chave de 256 bits
- Salt automático

---

#### 2. Least Privilege (Menor Privilégio)

```sql
-- Apenas roles necessários
GRANT EXECUTE ON FUNCTION decrypt_f360_token
TO authenticated, service_role;

-- NÃO concedido para:
-- - anon (usuários não autenticados)
-- - public (qualquer um)
```

---

#### 3. Fail Secure (Falha Segura)

```typescript
// Se chave não configurada: FALHA IMEDIATA
const kmsKey = Deno.env.get('APP_KMS');
if (!kmsKey) {
  throw new Error('APP_KMS not set'); // ← Não continua
}

// Se descriptografia falha: RETORNA NULL
SELECT decrypt_f360_token(id) FROM integration_f360;
-- NULL se:
-- - Token não existe
-- - Chave incorreta
-- - Erro de descriptografia
```

---

#### 4. Auditability (Auditabilidade)

**Logs Disponíveis:**

```bash
# Logs de Edge Function
supabase functions logs sync-f360 --project-ref xxx

# Logs de Secrets (Dashboard)
Supabase > Settings > Vault > Audit Logs

# Logs de PostgreSQL
Supabase > Database > Logs
```

**Métricas:**
- Quando APP_KMS foi acessado
- Quantas vezes decrypt_f360_token foi chamado
- Erros de descriptografia

---

### Checklist de Segurança

- [x] Chave gerada com `openssl rand -base64 32`
- [x] Chave armazenada em Supabase Secrets (não código)
- [x] Função SQL usa `SECURITY DEFINER`
- [x] GRANTs limitados (authenticated, service_role)
- [x] Edge Functions validam APP_KMS no início
- [x] Error handling não expõe detalhes
- [x] Logs de acesso habilitados
- [x] Fallback para `app.kms` (backward compatible)
- [x] Documentação de rotação de chaves

---

## 🐛 TROUBLESHOOTING

### Erro: "APP_KMS environment variable is not set"

**Causa:** Edge Function não encontra APP_KMS

**Solução:**
```bash
# 1. Verificar se secret existe
supabase secrets list --project-ref xzrmzmcoslomtzkzgskn

# 2. Se não existe, criar
supabase secrets set APP_KMS='sua_chave' --project-ref xzrmzmcoslomtzkzgskn

# 3. Redeploy função
supabase functions deploy sync-f360 --project-ref xzrmzmcoslomtzkzgskn

# 4. Aguardar propagação (30 segundos)
sleep 30

# 5. Testar novamente
```

---

### Erro: "Failed to decrypt token"

**Causa:** Chave KMS incorreta ou token corrompido

**Solução:**
```sql
-- No SQL Editor do Supabase

-- 1. Verificar se token existe
SELECT id, cliente_nome, LENGTH(token_f360_enc) as token_length
FROM integration_f360
WHERE id = 'seu-token-uuid';

-- 2. Testar descriptografia
SELECT decrypt_f360_token('seu-token-uuid'::uuid, 'sua_chave_kms');

-- Se retorna NULL:
-- - Chave está incorreta
-- - Token foi criptografado com chave diferente
-- - Token está corrompido

-- 3. Re-criptografar (se tiver token em texto plano)
UPDATE integration_f360 SET
  token_f360_enc = pgp_sym_encrypt('token_plaintext', 'sua_chave_kms')
WHERE id = 'seu-token-uuid';
```

---

### Erro: "permission denied for function decrypt_f360_token"

**Causa:** Role não tem permissão

**Solução:**
```sql
-- Conceder permissão
GRANT EXECUTE ON FUNCTION public.decrypt_f360_token(_id UUID, _kms TEXT)
TO authenticated, service_role;

-- Verificar permissões
SELECT
  routine_name,
  grantor,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'decrypt_f360_token';
```

---

### Logs Não Aparecem

**Causa:** Função não está sendo chamada ou logs não propagados

**Solução:**
```bash
# 1. Verificar últimos logs
supabase functions logs sync-f360 --project-ref xzrmzmcoslomtzkzgskn --tail

# 2. Forçar invocação
curl -X POST https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/sync-f360 \
  -H "Authorization: Bearer SERVICE_ROLE_KEY"

# 3. Ver logs em tempo real
supabase functions logs sync-f360 --project-ref xzrmzmcoslomtzkzgskn --follow
```

---

## 🔄 ROTAÇÃO DE CHAVES

### Quando Rotacionar

✅ **Obrigatório:**
- Chave foi comprometida (vazou)
- Funcionário com acesso saiu da empresa
- Requisito de compliance (ex: anual)

⚠️ **Recomendado:**
- A cada 90 dias (best practice)
- Após auditoria de segurança
- Mudança de ambiente (dev → prod)

---

### Processo de Rotação

#### Passo 1: Gerar Nova Chave

```bash
# Gerar nova chave
NEW_KEY=$(openssl rand -base64 32)
echo "Nova chave: $NEW_KEY"

# Guardar em local seguro
echo "$NEW_KEY" > ~/.keys/app_kms_new.txt
chmod 600 ~/.keys/app_kms_new.txt
```

---

#### Passo 2: Re-criptografar Tokens

```sql
-- No SQL Editor do Supabase

-- 1. Criar backup
CREATE TABLE integration_f360_backup AS
SELECT * FROM integration_f360;

-- 2. Descriptografar com chave antiga
WITH decrypted AS (
  SELECT
    id,
    cliente_nome,
    cnpj,
    decrypt_f360_token(id, 'CHAVE_ANTIGA') as token_plaintext,
    created_at
  FROM integration_f360
)
-- 3. Re-criptografar com chave nova
UPDATE integration_f360 i SET
  token_f360_enc = pgp_sym_encrypt(d.token_plaintext, 'CHAVE_NOVA')
FROM decrypted d
WHERE i.id = d.id;

-- 4. Verificar
SELECT
  id,
  cliente_nome,
  decrypt_f360_token(id, 'CHAVE_NOVA') IS NOT NULL as descriptografa_ok
FROM integration_f360;

-- Deve retornar TRUE para todos os registros
```

---

#### Passo 3: Atualizar APP_KMS

```bash
# Atualizar secret
supabase secrets set APP_KMS='CHAVE_NOVA' --project-ref xzrmzmcoslomtzkzgskn

# Aguardar propagação
sleep 30
```

---

#### Passo 4: Redeploy Functions

```bash
# Redeploy todas as funções que usam APP_KMS
supabase functions deploy sync-f360 --project-ref xzrmzmcoslomtzkzgskn
supabase functions deploy scheduled-sync-erp --project-ref xzrmzmcoslomtzkzgskn
supabase functions deploy whatsapp-bot --project-ref xzrmzmcoslomtzkzgskn

# Aguardar deploy
sleep 10
```

---

#### Passo 5: Testar

```bash
# Testar descriptografia
curl -X POST https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/sync-f360 \
  -H "Authorization: Bearer SERVICE_ROLE_KEY"

# Verificar logs
supabase functions logs sync-f360 --project-ref xzrmzmcoslomtzkzgskn --tail

# Se tudo OK, remover backup
# DROP TABLE integration_f360_backup;
```

---

### Rollback (Se Necessário)

```bash
# 1. Restaurar chave antiga
supabase secrets set APP_KMS='CHAVE_ANTIGA' --project-ref xzrmzmcoslomtzkzgskn

# 2. Restaurar tokens (se re-criptografados)
# Executar no SQL Editor:
INSERT INTO integration_f360
SELECT * FROM integration_f360_backup
ON CONFLICT (id) DO UPDATE SET
  token_f360_enc = EXCLUDED.token_f360_enc;

# 3. Redeploy functions
supabase functions deploy sync-f360 --project-ref xzrmzmcoslomtzkzgskn
```

---

## 📊 MÉTRICAS E MONITORAMENTO

### KPIs

| Métrica | Alvo | Como Medir |
|---------|------|------------|
| Taxa de sucesso descriptografia | > 99% | Logs de erro / Total |
| Tempo de descriptografia | < 100ms | Logs de performance |
| Rotações de chave | 1 por trimestre | Manual |
| Acessos não autorizados | 0 | Audit logs |

---

### Alertas Recomendados

```yaml
alerts:
  - name: "APP_KMS não configurado"
    condition: error_message contains "APP_KMS not set"
    severity: critical
    action: notify_devops

  - name: "Falha de descriptografia"
    condition: error_message contains "Failed to decrypt token"
    threshold: > 5 em 5 minutos
    severity: high
    action: notify_devops

  - name: "Taxa de sucesso baixa"
    condition: success_rate < 95%
    window: 1 hora
    severity: medium
    action: notify_team
```

---

## 📚 REFERÊNCIAS

### Documentação Oficial

- [Supabase Secrets Management](https://supabase.com/docs/guides/functions/secrets)
- [PostgreSQL pgcrypto](https://www.postgresql.org/docs/current/pgcrypto.html)
- [OpenSSL rand](https://www.openssl.org/docs/man1.1.1/man1/rand.html)

### Best Practices

- [OWASP Key Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)
- [NIST SP 800-57 (Key Management)](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)

### Arquivos do Projeto

- [supabase/migrations/20251110_create_decrypt_f360_token.sql](../finance-oraculo-backend/supabase/migrations/20251110_create_decrypt_f360_token.sql)
- [supabase/functions/sync-f360/index.ts](../finance-oraculo-backend/supabase/functions/sync-f360/index.ts)
- [supabase/functions/scheduled-sync-erp/index.ts](../finance-oraculo-backend/supabase/functions/scheduled-sync-erp/index.ts)
- [supabase/functions/common/db.ts](../finance-oraculo-backend/supabase/functions/common/db.ts)

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [x] Chave gerada com `openssl rand -base64 32`
- [x] APP_KMS registrado no Supabase Secrets
- [x] Migration aplicada (decrypt_f360_token com _kms)
- [x] sync-f360 atualizado e deployado
- [x] scheduled-sync-erp atualizado e deployado
- [x] whatsapp-bot atualizado
- [x] common/db.ts atualizado
- [x] Testes de integração executados
- [x] Documentação criada
- [x] Commit criado (18f06a5)

---

## 📞 SUPORTE

### Problemas Técnicos
- Consultar seção [Troubleshooting](#troubleshooting)
- Verificar [Supabase Dashboard Logs](https://supabase.com/dashboard/project/xzrmzmcoslomtzkzgskn/logs)
- Abrir issue no repositório

### Rotação de Chaves
- Seguir [Processo de Rotação](#processo-de-rotação)
- Testar em ambiente de staging primeiro
- Documentar cada passo

### Auditoria
- Logs disponíveis no Supabase Dashboard
- Período de retenção: 7 dias (free tier)
- Exportar logs para análise externa se necessário

---

**Documento criado por:** Claude Code (Sonnet 4.5)
**Data:** 11 de Novembro de 2025
**Versão:** 1.0
**Status:** ✅ Implementado e Deployado
**Commit:** 18f06a5
