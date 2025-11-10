# ❌ Chave F360 Incorreta

## Problema:
A chave `63520d44-fe1d-4c45-a127-d9abfb6dc85f` retornou **NULL** ao tentar descriptografar.

Isso significa que **NÃO é a chave correta**.

---

## 🔍 O que você fez:
```bash
supabase secrets set app.encryption_key='63520d44-fe1d-4c45-a127-d9abfb6dc85f' --project-ref xzrmzmcoslomtzkzgskn
```

## ❌ Resultado:
```sql
SELECT decrypt_f360_token('63520d44-fe1d-4c45-a127-d9abfb6dc85f');
-- Retornou: NULL
```

---

## ✅ Solução:

### Passo 1: Encontrar a Chave Correta

**No SQL Editor, execute:**
```sql
SELECT id, company_cnpj, token_enc FROM integration_f360 LIMIT 5;
```

Isso vai mostrar os tokens criptografados.

### Passo 2: Perguntar ao Time

A chave F360 deve estar em:
- 📋 Documentação de integração
- 🔐 Vault/Secrets do time
- 📧 Email de configuração
- 👨‍💻 DevOps/Team Lead

**Procure por:**
- "F360 encryption key"
- "F360 secret key"
- "F360 API key"
- Arquivo `.env` ou `secrets.yml`

### Passo 3: Configurar a Chave Correta

Quando encontrar a chave real (ex: `abc123def456...`):

```bash
supabase secrets set app.encryption_key='CHAVE_REAL_AQUI' --project-ref xzrmzmcoslomtzkzgskn
```

### Passo 4: Validar

**No SQL Editor:**
```sql
SELECT decrypt_f360_token('63520d44-fe1d-4c45-a127-d9abfb6dc85f');
```

**Deve retornar um token válido (não NULL).**

---

## ⚠️ Observações:

1. **ID vs Chave:**
   - ❌ `63520d44-fe1d-4c45-a127-d9abfb6dc85f` = ID do token (não é chave)
   - ✅ A chave é uma string diferente, geralmente mais longa

2. **Formato da Chave:**
   - Pode ser: `abc123...` (alfanumérica)
   - Pode ser: `sk_live_...` (formato OpenAI)
   - Pode ser: `-----BEGIN...` (PEM)

3. **Sem a Chave:**
   - ❌ Sincronização F360 não funciona
   - ❌ Dados não são importados
   - ⏳ Sistema funciona com dados de teste

---

## 🎯 Próximas Ações:

1. ⏳ Encontrar chave F360 correta
2. ✅ Configurar chave
3. ✅ Deploy Frontend (15 min)
4. ✅ Configurar Agendamentos (5 min)

---

**Status:** Aguardando chave F360 correta
